//! Hosts-file based site blocker (SelfControl-style), plus a PF firewall layer
//! on macOS.
//!
//! While a focus session is running, the frontend calls `start_block` with the
//! user's blocklist. We append a clearly-delimited section to the system hosts
//! file that points each domain (and its `www.` form) at the unspecified
//! address for both IPv4 and IPv6, then flush the DNS cache. `stop_block`
//! removes that section and flushes again, so sites work normally when no
//! session is active.
//!
//! On macOS we additionally install PF rules (see `pf`), because the hosts file
//! alone is porous: DNS-over-HTTPS, raw IPs and already-open connections all
//! walk straight past it.
//!
//! Editing the hosts file requires administrator/root privileges — see the
//! README for how to run the app with the needed permissions on each OS.

use std::path::PathBuf;

const BEGIN: &str = "# >>> lock.in block >>>";
const END: &str = "# <<< lock.in block <<<";

/// Where blocked names are sent.
///
/// The unspecified address, not loopback. `127.0.0.1` hands the request to
/// whatever is listening locally — on a developer's machine that's often a dev
/// server, so a "blocked" site can answer with someone else's app instead of
/// failing. `0.0.0.0` isn't a valid destination, so the connection is refused
/// immediately rather than timing out. Same reasoning for `::` over `::1`.
const SINK_V4: &str = "0.0.0.0";
const SINK_V6: &str = "::";

/// Shadow hosts files some VPN clients consult instead of `/etc/hosts`.
/// Blocked alongside the real one, but only where they already exist.
#[cfg(target_os = "macos")]
const VPN_HOSTS_FILES: &[&str] = &[
    "/etc/pulse-hosts.bak",
    "/etc/jnpr-pulse-hosts.bak",
    "/etc/pulse.hosts.bak",
    "/etc/jnpr-nc-hosts.bak",
    "/etc/hosts.ac",
];

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

/// Whether a string is a plausible hostname and nothing else.
///
/// This is the security boundary for the whole blocker. `normalize_domain`
/// used to sanitise by *removing* the characters it knew about, which meant
/// anything it hadn't thought of — a newline, most obviously — passed through
/// and became extra lines in a file we write to as root. Rejecting anything
/// that isn't a hostname is the only version of this that's safe by default.
///
/// Deliberately strict: ASCII letters, digits and hyphens, in dot-separated
/// labels, at least two labels. Whitespace, control characters and anything
/// exotic are simply not hostnames.
pub fn is_valid_hostname(host: &str) -> bool {
    if host.is_empty() || host.len() > 253 {
        return false;
    }
    let labels: Vec<&str> = host.split('.').collect();
    // Require a dot: a bare word is never a site you meant to block, and it
    // keeps single-token junk out of the hosts file.
    if labels.len() < 2 {
        return false;
    }
    labels.iter().all(|label| {
        !label.is_empty()
            && label.len() <= 63
            && label.starts_with(|c: char| c.is_ascii_alphanumeric())
            && label.ends_with(|c: char| c.is_ascii_alphanumeric())
            && label
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-')
    })
}

/// Normalize a user-entered domain to a bare host, e.g.
/// "https://www.YouTube.com/watch" -> "youtube.com".
///
/// Returns an empty string for anything that isn't a hostname once trimmed.
/// Callers skip empties, so invalid input is dropped rather than written.
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
        .trim()
        .to_string();

    if is_valid_hostname(&d) {
        d
    } else {
        String::new()
    }
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
            out.push_str(&format!("{SINK_V4}\t{host}\n"));
            out.push_str(&format!("{SINK_V6}\t{host}\n"));
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

/// Write a system file without ever leaving it half-written.
///
/// `fs::write` truncates first, so a crash, a full disk or a power cut between
/// truncate and write leaves a *shortened* `/etc/hosts` — no `localhost`, no
/// `broadcasthost` — and a machine whose networking is subtly broken in a way
/// that has nothing obviously to do with a focus timer. Writing a sibling temp
/// file and renaming over the target makes the swap atomic on POSIX, so the
/// file is either the old contents or the new ones and never something between.
pub fn write_atomic(path: &std::path::Path, content: &str) -> std::io::Result<()> {
    let dir = path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("lockin");
    let tmp = dir.join(format!(".{name}.lockin.tmp"));
    std::fs::write(&tmp, content)?;
    // Rename replaces the destination on both Unix and Windows.
    match std::fs::rename(&tmp, path) {
        Ok(()) => Ok(()),
        Err(e) => {
            let _ = std::fs::remove_file(&tmp);
            Err(e)
        }
    }
}

/// Keep one pristine copy of the hosts file, made before we first touch it.
///
/// If our section ever can't be removed cleanly, this is what a human can
/// restore from. Written once and then left alone, so it can't be overwritten
/// with an already-modified version.
fn backup_hosts_once(original: &str) {
    let path = hosts_path().with_extension("lockin-original");
    if !path.exists() {
        let _ = std::fs::write(path, original);
    }
}

fn write_hosts(content: &str) -> Result<(), String> {
    write_atomic(&hosts_path(), content).map_err(|e| {
        format!(
            "Couldn't write the hosts file ({e}). The app needs administrator/root \
             permission to change site blocking."
        )
    })
}

fn flush_dns() {
    #[cfg(windows)]
    {
        // Absolute path: this runs as Administrator, and Windows' executable
        // search includes the working directory before System32. A bare name
        // would let an `ipconfig.exe` sitting in Downloads run elevated.
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let _ = std::process::Command::new(format!("{root}\\System32\\ipconfig.exe"))
            .arg("/flushdns")
            .output();
    }
    #[cfg(target_os = "macos")]
    {
        // All three, in this order, matching SelfControl. dscacheutil is a
        // no-op on modern macOS but harmless; the SIGHUP is what actually
        // clears mDNSResponder's cache. Without this a site you visited a
        // minute ago still loads from cache and the block looks broken.
        let _ = std::process::Command::new("/usr/bin/dscacheutil")
            .arg("-flushcache")
            .output();
        let _ = std::process::Command::new("/usr/bin/killall")
            .args(["-HUP", "mDNSResponder"])
            .output();
        let _ = std::process::Command::new("/usr/bin/killall")
            .arg("mDNSResponderHelper")
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

/// Mirror the block into any VPN shadow hosts files that exist.
///
/// Cisco AnyConnect and Juniper Pulse keep their own copies and resolve
/// against those, so a block that only touches `/etc/hosts` silently stops
/// working the moment a VPN connects. Best-effort by design.
#[cfg(target_os = "macos")]
fn apply_to_vpn_hosts(domains: &[String], blocking: bool) {
    for path in VPN_HOSTS_FILES {
        let p = std::path::Path::new(path);
        if !p.exists() {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(p) else {
            continue;
        };
        // Don't rewrite a file we've never touched: `lines()` drops \r, so
        // reflowing a CRLF shadow hosts file would silently rewrite it whole.
        if !blocking && !has_section(&content) {
            continue;
        }
        let updated = if blocking {
            apply(&content, domains)
        } else {
            strip_section(&content)
        };
        let _ = write_atomic(p, &updated);
    }
}

#[cfg(not(target_os = "macos"))]
fn apply_to_vpn_hosts(_domains: &[String], _blocking: bool) {}

// --- Tauri commands ---

#[tauri::command]
pub fn start_block(domains: Vec<String>) -> Result<(), String> {
    let content = read_hosts()?;
    // Keep a pristine copy before the first ever modification, so there's
    // something to restore from if our section can't be removed cleanly.
    if !has_section(&content) {
        backup_hosts_once(&content);
    }
    let updated = apply(&content, &domains);
    write_hosts(&updated)?;
    apply_to_vpn_hosts(&domains, true);

    // PF is an enhancement layered on top, so a failure here is reported to the
    // log but must not fail the session — the hosts block is already live and
    // is the part that covers the ordinary case.
    #[cfg(target_os = "macos")]
    {
        let normalized: Vec<String> = domains.iter().map(|d| normalize_domain(d)).filter(|d| !d.is_empty()).collect();
        if let Err(e) = crate::pf::start(&normalized) {
            eprintln!("lock.in: hosts block is active, but PF rules failed: {e}");
        }
    }

    flush_dns();
    Ok(())
}

#[tauri::command]
pub fn stop_block() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // Unwind PF first: if a later step fails, better to be left with a
        // stale hosts entry than with traffic still blocked at the packet level.
        let _ = crate::pf::stop();
    }

    let content = read_hosts()?;
    apply_to_vpn_hosts(&[], false);
    if !has_section(&content) {
        flush_dns();
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

/// Re-apply the block if something removed it mid-session.
///
/// The frontend calls this periodically while a session runs. Editing
/// `/etc/hosts` back by hand is the obvious way around a blocker, and it's the
/// kind of thing that feels clever at minute forty and pointless afterwards.
#[tauri::command]
pub fn reassert_block(domains: Vec<String>) -> Result<bool, String> {
    let hosts_ok = has_section(&read_hosts()?);
    #[cfg(target_os = "macos")]
    let pf_ok = crate::pf::is_active();
    #[cfg(not(target_os = "macos"))]
    let pf_ok = true;

    if hosts_ok && pf_ok {
        return Ok(false);
    }
    start_block(domains)?;
    Ok(true)
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
    fn a_newline_cannot_smuggle_extra_hosts_entries() {
        // The whole point of validating rather than stripping. This string is
        // a legal hosts line, so a sanitiser that only removed `/?#:` let it
        // through and wrote an attacker's mapping to /etc/hosts as root --
        // reachable by importing a shared backup, which never re-normalises.
        let payload = "x.test\n0.0.0.0 accounts.google.com";
        assert_eq!(normalize_domain(payload), "");

        let section = build_section(&[payload.to_string()]);
        assert!(!section.contains("accounts.google.com"));
        // Only the two markers and the comment remain -- nothing was written.
        assert_eq!(section.lines().filter(|l| l.starts_with("0.0.0.0")).count(), 0);
    }

    #[test]
    fn rejects_anything_that_is_not_a_hostname() {
        for bad in [
            "x.test\nevil.com",       // newline
            "x.test\revil.com",       // carriage return
            "x.test\tevil.com",       // tab
            "has space.com",
            "localhost",              // single label
            "-lead.com",              // label may not start with a hyphen
            "trail-.com",             // ...or end with one
            "..",
            ".com",
            "a..b.com",               // empty label
            "*.wildcard.com",
            "emoji😀.com",
        ] {
            assert_eq!(normalize_domain(bad), "", "should have rejected {bad:?}");
        }
    }

    #[test]
    fn still_accepts_ordinary_domains() {
        for good in [
            "youtube.com",
            "news.ycombinator.com",
            "sub.domain.co.uk",
            "x-y.example.com",
            "123.example.com",
        ] {
            assert_eq!(normalize_domain(good), good, "should have accepted {good:?}");
        }
    }

    #[test]
    fn writes_are_atomic_and_leave_no_temp_file_behind() {
        let dir = std::env::temp_dir().join(format!("lockin-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let target = dir.join("hosts");

        write_atomic(&target, "first\n").unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "first\n");

        // Overwriting must replace cleanly, not append or half-write.
        write_atomic(&target, "second\n").unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "second\n");

        let leftovers: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains("tmp"))
            .collect();
        assert!(leftovers.is_empty(), "temp file was left behind");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn builds_section_with_ipv4_ipv6_and_www() {
        let s = build_section(&["youtube.com".into()]);
        assert!(s.contains("0.0.0.0\tyoutube.com"));
        assert!(s.contains("0.0.0.0\twww.youtube.com"));
        assert!(s.contains("::\tyoutube.com"));
        assert!(s.contains("::\twww.youtube.com"), "IPv6 is the classic hole");
        assert!(s.starts_with(BEGIN));
        assert!(s.trim_end().ends_with(END));
    }

    #[test]
    fn never_points_a_blocked_site_at_loopback() {
        // 127.0.0.1 would hand the request to whatever dev server is running
        // locally, so a "blocked" site can quietly serve someone else's app.
        let s = build_section(&["youtube.com".into()]);
        assert!(!s.contains("127.0.0.1"));
        assert!(!s.contains("::1\t"));
    }

    #[test]
    fn dedupes_domains() {
        let s = build_section(&["x.com".into(), "https://www.x.com".into()]);
        let count = s.matches("0.0.0.0\tx.com\n").count();
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
        assert!(blocked.contains("0.0.0.0\ta.com"));

        let restored = strip_section(&blocked);
        assert!(!has_section(&restored));
        assert!(restored.contains("127.0.0.1\tlocalhost"), "user's own entries must survive");
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
