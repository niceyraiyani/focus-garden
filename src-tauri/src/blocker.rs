//! Hosts-file based site blocker (SelfControl-style, simplified).
//!
//! While a focus session is running, the frontend calls `start_block` with the
//! user's blocklist. We append a clearly-delimited section to the system hosts
//! file that points each domain (and its `www.` form) at localhost for both
//! IPv4 and IPv6, then flush the DNS cache. `stop_block` removes that section
//! and flushes again, so sites work normally when no session is active.
//!
//! Editing the hosts file requires administrator/root privileges — see the
//! README for how to run the app with the needed permissions on each OS.

use std::path::PathBuf;

const BEGIN: &str = "# >>> lock.in block >>>";
const END: &str = "# <<< lock.in block <<<";

/// Platform-specific path to the system hosts file.
pub fn hosts_path() -> PathBuf {
    #[cfg(windows)]
    {
        // Honor SystemRoot in case Windows isn't on C:.
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        PathBuf::from(format!("{root}\\System32\\drivers\\etc\\hosts"))
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("/etc/hosts")
    }
}

/// Normalize a user-entered domain to a bare host, e.g.
/// "https://www.YouTube.com/watch" -> "youtube.com".
pub fn normalize_domain(input: &str) -> String {
    let mut d = input.trim().to_lowercase();
    if let Some(rest) = d.strip_prefix("https://") {
        d = rest.to_string();
    } else if let Some(rest) = d.strip_prefix("http://") {
        d = rest.to_string();
    }
    if let Some(rest) = d.strip_prefix("www.") {
        d = rest.to_string();
    }
    // Drop any path/query/port.
    d = d
        .split('/')
        .next()
        .unwrap_or("")
        .split('?')
        .next()
        .unwrap_or("")
        .split('#')
        .next()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_string();
    d
}

/// Build the block section text for a set of domains (no surrounding blank lines).
pub fn build_section(domains: &[String]) -> String {
    let mut out = String::new();
    out.push_str(BEGIN);
    out.push('\n');
    out.push_str("# Managed by lock.in. Do not edit; removed when your session ends.\n");
    let mut seen: Vec<String> = Vec::new();
    for raw in domains {
        let d = normalize_domain(raw);
        if d.is_empty() || seen.contains(&d) {
            continue;
        }
        seen.push(d.clone());
        for host in [d.clone(), format!("www.{d}")] {
            out.push_str(&format!("127.0.0.1\t{host}\n"));
            out.push_str(&format!("::1\t{host}\n"));
        }
    }
    out.push_str(END);
    out
}

/// Remove any existing lock.in section from hosts content.
pub fn strip_section(content: &str) -> String {
    let mut result = Vec::new();
    let mut skipping = false;
    for line in content.lines() {
        if line.trim() == BEGIN {
            skipping = true;
            continue;
        }
        if line.trim() == END {
            skipping = false;
            continue;
        }
        if !skipping {
            result.push(line);
        }
    }
    // Trim trailing blank lines, keep exactly one terminating newline.
    let mut joined = result.join("\n");
    while joined.ends_with('\n') || joined.ends_with(char::is_whitespace) {
        joined.pop();
    }
    joined.push('\n');
    joined
}

/// Produce new hosts content with a fresh block section for `domains`,
/// replacing any previous lock.in section.
pub fn apply(content: &str, domains: &[String]) -> String {
    let base = strip_section(content);
    let mut out = base;
    if !out.ends_with('\n') {
        out.push('\n');
    }
    out.push('\n');
    out.push_str(&build_section(domains));
    out.push('\n');
    out
}

/// Whether the hosts content currently contains our block section.
pub fn has_section(content: &str) -> bool {
    content.lines().any(|l| l.trim() == BEGIN)
}

// --- Filesystem-backed operations (require privileges) ---

fn read_hosts() -> Result<String, String> {
    std::fs::read_to_string(hosts_path()).map_err(|e| format!("Couldn't read the hosts file: {e}"))
}

fn write_hosts(content: &str) -> Result<(), String> {
    std::fs::write(hosts_path(), content).map_err(|e| {
        format!(
            "Couldn't write the hosts file ({e}). The app needs administrator/root \
             permission to change site blocking."
        )
    })
}

fn flush_dns() {
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("ipconfig").arg("/flushdns").output();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("dscacheutil").arg("-flushcache").output();
        let _ = std::process::Command::new("killall")
            .args(["-HUP", "mDNSResponder"])
            .output();
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        // Best-effort on Linux; harmless if the tool isn't present.
        let _ = std::process::Command::new("resolvectl")
            .arg("flush-caches")
            .output();
    }
}

// --- Tauri commands ---

#[tauri::command]
pub fn start_block(domains: Vec<String>) -> Result<(), String> {
    let content = read_hosts()?;
    let updated = apply(&content, &domains);
    write_hosts(&updated)?;
    flush_dns();
    Ok(())
}

#[tauri::command]
pub fn stop_block() -> Result<(), String> {
    let content = read_hosts()?;
    if !has_section(&content) {
        return Ok(());
    }
    let updated = strip_section(&content);
    write_hosts(&updated)?;
    flush_dns();
    Ok(())
}

#[tauri::command]
pub fn is_blocking() -> Result<bool, String> {
    Ok(has_section(&read_hosts()?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_domains() {
        assert_eq!(normalize_domain("https://www.YouTube.com/watch?v=1"), "youtube.com");
        assert_eq!(normalize_domain("Reddit.com"), "reddit.com");
        assert_eq!(normalize_domain("  http://x.com:443/  "), "x.com");
        assert_eq!(normalize_domain(""), "");
    }

    #[test]
    fn builds_section_with_ipv4_ipv6_and_www() {
        let s = build_section(&["youtube.com".into()]);
        assert!(s.contains("127.0.0.1\tyoutube.com"));
        assert!(s.contains("127.0.0.1\twww.youtube.com"));
        assert!(s.contains("::1\tyoutube.com"));
        assert!(s.starts_with(BEGIN));
        assert!(s.trim_end().ends_with(END));
    }

    #[test]
    fn dedupes_domains() {
        let s = build_section(&["x.com".into(), "https://www.x.com".into()]);
        let count = s.matches("127.0.0.1\tx.com\n").count();
        assert_eq!(count, 1);
    }

    #[test]
    fn apply_is_idempotent() {
        let original = "127.0.0.1\tlocalhost\n";
        let once = apply(original, &["a.com".into()]);
        let twice = apply(&once, &["a.com".into()]);
        assert_eq!(once, twice, "re-applying same block should not stack sections");
        assert_eq!(once.matches(BEGIN).count(), 1);
    }

    #[test]
    fn strip_restores_original_and_preserves_user_entries() {
        let original = "127.0.0.1\tlocalhost\n255.255.255.255\tbroadcasthost\n";
        let blocked = apply(original, &["a.com".into(), "b.com".into()]);
        assert!(has_section(&blocked));
        assert!(blocked.contains("127.0.0.1\ta.com"));

        let restored = strip_section(&blocked);
        assert!(!has_section(&restored));
        assert!(restored.contains("127.0.0.1\tlocalhost"));
        assert!(restored.contains("broadcasthost"));
        assert!(!restored.contains("a.com"));
    }

    #[test]
    fn changing_blocklist_replaces_previous_section() {
        let original = "127.0.0.1\tlocalhost\n";
        let first = apply(original, &["a.com".into()]);
        let second = apply(&first, &["b.com".into()]);
        assert!(second.contains("b.com"));
        assert!(!second.contains("a.com"));
        assert_eq!(second.matches(BEGIN).count(), 1);
    }
}
