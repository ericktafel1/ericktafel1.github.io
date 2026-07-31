const input = document.getElementById("terminal-command");
const output = document.getElementById("output");

const BANNER = `
░██████╗░░░███╗░░░██████╗░░██████╗
██╔════╝░░████║░░██╔════╝░██╔════╝
██║░░██╗░██╔██║░░██║░░██╗░╚█████╗░
██║░░╚██╗╚═╝██║░░██║░░╚██╗░╚═══██╗
╚██████╔╝███████╗╚██████╔╝██████╔╝
░╚═════╝░╚══════╝░╚═════╝░╚═════╝░`;

let cwd = "/home/g1gs";
let currentUser = "g1gs";
let isRoot = false;
let commandHistory = [];
let historyIndex = 0;
const CTF_FLAGS = [
    "g1gs{d0t_f1l3s_l34v3_f00tpr1nts}",
    "g1gs{c0nf1g_l34ks_b3c0m3_1n1t14l_4cc3ss}",
    "g1gs{cr3d_r3us3_0p3ns_s1d3_d00rs}",
    "g1gs{m1sc0nf1gur3d_b4ckups_br34k_b0und4r13s}",
    "g1gs{r00t_c4us3_1s_4lw4ys_th3_g04l}"
];
let capturedFlags = new Set(JSON.parse(localStorage.getItem("portfolio-ctf-flags") || "[]"));

const fs = {
  "/": {
    "home": {
      "g1gs": {
        ".operator_note.txt": "OPERATOR NOTE: Start by enumerating hidden files in projects/. Every flag points toward the next phase.",
        "welcome.txt": "Operation Breadcrumb is a fictional five-flag Linux investigation. Type challenge for the briefing.",
        "projects": {
          "SDRDemon": {
            "README.txt": "SDRDemon — a Metasploit-inspired workbench for authorized RF testing. Select an SDR and attack profile, configure parameters, execute, and monitor the live spectrum. Repository status: PRIVATE / ACTIVE DEVELOPMENT.",
            "capabilities.conf": "operations=[capture,replay,gps_simulation,jamming]\ninterfaces=[attack_profiles,spectrum_analyzer,sigmf_metadata,safety_link_budget,drone_detection,debug]\ncompatibility=[SigMF,GRC,gps-sdr-sim]\nlogging=prompt_on_exit",
            "validation.log": "PASS HackRF One: capture, replay, GPS simulation/spoofing, jamming\nUNTESTED: other SDR hardware\nUNTESTED: drone-detection workflow"
          },
          "ctf_notes": "Public CTF methodology and notes.",
          ".archive": {
            "flag01.txt": "g1gs{d0t_f1l3s_l34v3_f00tpr1nts}",
            "next.txt": "A deployment ticket references /var/www/portal and warns that dotfiles were copied to production."
          }
        }
      },
      "websvc": {
        "user.txt": "g1gs{cr3d_r3us3_0p3ns_s1d3_d00rs}",
        "ops-note.txt": "Run sudo -l. The approved backup utility may trust restore paths too much."
      }
    },
    "var": {
      "www": {
        "portal": {
          "index.html": "<h1>Operator Portal</h1>",
          ".env": "APP_ENV=production\nSERVICE_USER=websvc\nSERVICE_PASSWORD=orbital-demo-47\nCONFIG_FLAG=g1gs{c0nf1g_l34ks_b3c0m3_1n1t14l_4cc3ss}",
          "README.md": "Deployment root for the fictional operator portal. Secrets do not belong in web roots."
        }
      }
    },
    "etc": {
      "sudoers.d": {
        "websvc": "websvc ALL=(root) NOPASSWD: /usr/local/bin/backupctl"
      }
    },
    "opt": {
      "backups": {
        "manifest.txt": "restore_source=/var/www/portal\nrestore_target=/srv/portal\nAUDIT_FLAG=g1gs{m1sc0nf1gur3d_b4ckups_br34k_b0und4r13s}",
        "operator-note.txt": "backupctl 0.8 performs privileged restores without canonicalizing the supplied source path."
      }
    },
    "root": {
      "root.txt": "g1gs{r00t_c4us3_1s_4lw4ys_th3_g04l}",
      "engagement.txt": "Lab complete. Document the chain: exposure, credential reuse, excessive sudo rights, impact, and remediation."
    },
    "usr": { "local": { "bin": { "backupctl": "Fictional privileged backup utility. Use sudo -l for permitted syntax." } } }
  }
};

const bootLines = [
    { text: "Initializing g1gs Kernel 1.2.25...", color: "var(--text-secondary)" },
    { text: "[ OK ] Loading secure_module...", color: "var(--neon-green)" },
    { text: "[ OK ] Mounting /dev/sda1 on /home/g1gs...", color: "var(--neon-green)" },
    { text: "[WARN] Detecting intrusion prevention systems...", color: "orange" },
    { text: "[ OK ] IPS bypassed successfully.", color: "var(--neon-green)" },
    { text: "SYSTEMS NOMINAL", color: "var(--glitch-white)" },
    { text: "Starting Terminal UI...", color: "var(--text-secondary)" },
    { text: "Access Granted.", color: "var(--neon-green)" },
    { text: "g1gs@portfolio:~$ cat /etc/operator.conf", color: "var(--neon-green)" },
    { text: '[+] DESIGNATION="Cybersecurity Engineer"', color: "var(--neon-green)" },
    { text: '[+] SPECIALTY="Web App Testing, Penetration Testing, Offensive Security"', color: "var(--neon-green)" },
    { text: "g1gs@portfolio:~$ systemctl status --all", color: "var(--neon-green)" },
    { text: "[+] Offensive capabilities: READY", color: "var(--neon-green)" },
    { text: "[+] Defense protocols: ACTIVE", color: "var(--neon-green)" },
    { text: "[+] Intel gathering: OPERATIONAL", color: "var(--neon-green)" },
    { text: " ", color: "var(--neon-green)" }
];

async function printLine(text, color = "var(--neon-green)", isHtml = false, extraClass = "") {
    const line = document.createElement("div");
    line.className = "terminal-line" + (extraClass ? " " + extraClass : "");
    line.style.color = color;
    if (isHtml) {
        line.innerHTML = text;
    } else {
        line.style.whiteSpace = "pre-wrap"; 
        line.textContent = text;
    }
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function captureFlags(content) {
    const found = CTF_FLAGS.filter(flag => String(content).includes(flag));
    let capturedNow = 0;
    found.forEach(flag => {
        if (!capturedFlags.has(flag)) { capturedFlags.add(flag); capturedNow += 1; }
    });
    if (capturedNow) {
        localStorage.setItem("portfolio-ctf-flags", JSON.stringify(Array.from(capturedFlags)));
        updateProgress();
        printLine("FLAG CAPTURED // " + capturedFlags.size + "/" + CTF_FLAGS.length + " objectives complete.", "#8dffab", false, "success");
    }
    return capturedNow;
}

function normalizePath(path) {
    const absolute = path.startsWith("/") ? path : cwd + "/" + path;
    const parts = [];
    absolute.split("/").forEach(part => {
        if (!part || part === ".") return;
        if (part === "..") parts.pop(); else parts.push(part);
    });
    return "/" + parts.join("/");
}

function getNode(path) {
    const normalized = normalizePath(path);
    let node = fs["/"];
    for (const part of normalized.split("/").filter(Boolean)) {
        if (!node || typeof node !== "object" || !(part in node)) return undefined;
        node = node[part];
    }
    return node;
}

function canAccess(path) {
    const normalized = normalizePath(path);
    if (normalized.startsWith("/root")) return isRoot;
    if (normalized.startsWith("/home/websvc") || normalized.startsWith("/opt/backups")) return isRoot || currentUser === "websvc";
    return true;
}

function displayCwd() {
    const home = currentUser === "websvc" ? "/home/websvc" : "/home/g1gs";
    return cwd === home ? "~" : cwd.startsWith(home + "/") ? "~" + cwd.slice(home.length) : cwd;
}

function formatLongListing(folder, showHidden) {
    const names = Object.keys(folder).filter(name => showHidden ? true : !name.startsWith("."));
    const entries = names.map(name => ({ name: name, value: folder[name] }));
    const rows = showHidden ? [{ name: ".", value: folder }, { name: "..", value: {} }].concat(entries) : entries;
    const total = rows.reduce((sum, entry) => sum + (typeof entry.value === "object" ? 4 : Math.max(1, Math.ceil(String(entry.value).length / 1024))), 0);
    const lines = ["total " + total];
    rows.forEach((entry, index) => {
        const directory = typeof entry.value === "object";
        const extension = entry.name.split(".").pop();
        const executable = !directory && ["py", "sh"].includes(extension);
        const mode = directory ? "drwxr-xr-x" : executable ? "-rwxr-xr-x" : entry.name === ".env" ? "-rw-r-----" : entry.name.startsWith(".") || entry.name === "root.txt" ? "-rw-------" : "-rw-r--r--";
        const owner = cwd.startsWith("/root") || cwd.startsWith("/opt") || cwd.startsWith("/etc") ? "root" : cwd.startsWith("/var/www") ? "www-data" : cwd.startsWith("/home/websvc") ? "websvc" : "g1gs";
        const group = owner === "www-data" ? "www-data" : owner === "root" ? "root" : "operators";
        const links = directory ? 2 : 1;
        const size = directory ? 4096 : new Blob([String(entry.value)]).size;
        const date = index % 2 ? "Jul 30 21:37" : "Jul 31 09:13";
        lines.push(mode + " " + String(links).padStart(2) + " " + owner.padEnd(8) + " " + group.padEnd(9) + " " + String(size).padStart(6) + " " + date + " " + entry.name + (directory ? "/" : ""));
    });
    return lines.join("\n");
}

// Resolve the current virtual directory without touching the visitor device.
function getCurrentFolder() {
    return getNode(cwd);
}

async function bootSequence() {
    output.innerHTML = "";
    for (const line of bootLines) {
        await new Promise(r => setTimeout(r, 100));
        printLine(line.text, line.color);
    }
    await new Promise(r => setTimeout(r, 500));
    const bannerHTML = `<pre style="font-size: clamp(4px, 1.2vw, 14px); line-height: 1; color: var(--neon-green); white-space: pre;">${BANNER}</pre>`;
    printLine(bannerHTML, "var(--neon-green)", true);
    printLine("Welcome back, g1gs.", "var(--text-secondary)");
    printLine("Type challenge to begin, or help for commands.");
    updateProgress();
}

function runCommand(cmd) {
    const args = cmd.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const pathArg = args[1];

    switch (command) {
        case "pwd":
            printLine(cwd);
            break;

        case "whoami":
            printLine(currentUser);
            break;

        case "id":
            printLine(isRoot ? "uid=0(root) gid=0(root) groups=0(root)" : currentUser === "websvc" ? "uid=1001(websvc) gid=1001(websvc) groups=1001(websvc),27(sudo)" : "uid=1000(g1gs) gid=1000(g1gs) groups=1000(g1gs),1002(operators)");
            break;

        case "ll":
        case "ls": {
            const lsFolder = getCurrentFolder();
            const longFormat = command === "ll" || args.some(arg => arg.startsWith("-") && arg.includes("l"));
            const showHidden = command === "ll" || args.some(arg => arg.startsWith("-") && arg.includes("a"));
            const files = Object.keys(lsFolder).filter(name => showHidden || !name.startsWith("."));
            const shortListing = files.map(name => typeof lsFolder[name] === "object" ? name + "/" : name).join("  ");
            printLine(longFormat ? formatLongListing(lsFolder, showHidden) : shortListing);
            break;
        }

        case "cd": {
            const destination = !pathArg || pathArg === "~" ? (currentUser === "websvc" ? "/home/websvc" : "/home/g1gs") : normalizePath(pathArg);
            const target = getNode(destination);
            if (!canAccess(destination)) {
                printLine("bash: cd: " + pathArg + ": Permission denied", "#ff8b8b", false, "error");
            } else if (target && typeof target === "object") {
                cwd = destination;
            } else {
                printLine("bash: cd: " + pathArg + ": No such directory");
            }
            break;
        }

        case "cat": {
            if (!pathArg) { printLine("Usage: cat [filename]"); break; }
            const targetPath = normalizePath(pathArg);
            if (!canAccess(targetPath)) { printLine("cat: " + pathArg + ": Permission denied", "#ff8b8b", false, "error"); break; }
            const content = getNode(targetPath);
            if (typeof content === "string") {
                printLine(content);
                captureFlags(content);
            } else if (typeof content === "object") {
                printLine("cat: " + pathArg + ": Is a directory");
            } else {
                printLine("cat: " + pathArg + ": No such file or directory");
            }
            break;
        }

        case "hint": {
            const hints = [
                "Enumerate hidden entries under /home/g1gs/projects with ls -la.",
                "The archive note names a production web root. Inspect dotfiles in /var/www/portal.",
                "The config exposes a fictional service credential. Try: su websvc <password>.",
                "As websvc, inspect ~/user.txt, ~/ops-note.txt, and sudo -l; then read the backup manifest through backupctl.",
                "The fictional restore utility trusts paths. Try its restore action with ../../bin/sh, then inspect /root."
            ];
            printLine("Hint " + Math.min(capturedFlags.size + 1, 5) + "/5: " + hints[Math.min(capturedFlags.size, 4)], "orange");
            break;
        }

        case "challenge":
            printLine("OPERATION BREADCRUMB // Capture five unique flags across a fictional Linux host.\nPhases: enumerate → inspect web configuration → pivot users → audit sudo rights → demonstrate impact.\nCommands are simulated in-browser; no network requests, real credentials, or host commands are used. Type hint if blocked.", "var(--text-primary)");
            break;

        case "status":
            printLine("Objectives: " + capturedFlags.size + "/" + CTF_FLAGS.length + " flags captured. Current identity: " + currentUser + ".");
            break;

        case "su":
            if (args[1] === "websvc" && args[2] === "orbital-demo-47") {
                currentUser = "websvc";
                isRoot = false;
                cwd = "/home/websvc";
                printLine("Authentication successful. Switched to websvc.", "#8dffab");
            } else {
                printLine("su: Authentication failure. Usage in this lab: su <user> <password>", "#ff8b8b", false, "error");
            }
            break;

        case "sudo": {
            if (args[1] === "-l") {
                if (currentUser === "websvc") printLine("Matching Defaults entries for websvc:\n    env_reset, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin\n\nUser websvc may run the following commands without a password:\n    (root) NOPASSWD: /usr/local/bin/backupctl");
                else if (isRoot) printLine("User root may run all commands.");
                else printLine("Sorry, user " + currentUser + " may not run sudo on portfolio-lab.", "#ff8b8b", false, "error");
                break;
            }
            const backupCommand = args[1] === "/usr/local/bin/backupctl" || args[1] === "backupctl";
            if (!backupCommand || (currentUser !== "websvc" && !isRoot)) { printLine("sudo: command not permitted", "#ff8b8b", false, "error"); break; }
            if (args[2] === "--read-manifest") {
                const manifest = getNode("/opt/backups/manifest.txt");
                printLine(manifest);
                captureFlags(manifest);
            } else if (args[2] === "--restore" && args[3] === "../../bin/sh") {
                currentUser = "root";
                isRoot = true;
                cwd = "/root";
                printLine("SIMULATED PRIVILEGE ESCALATION // restore path escaped the allowlisted directory. Root shell granted.", "#8dffab", false, "success");
            } else {
                printLine("backupctl 0.8\nUsage: sudo backupctl --read-manifest | --restore <source>");
            }
            break;
        }

        case "submit":
            if (!pathArg) { printLine("Usage: submit g1gs{...}", "#ff8b8b"); break; }
            if (CTF_FLAGS.includes(pathArg)) {
                const wasNew = captureFlags(pathArg);
                if (!wasNew) printLine("Flag already captured.", "var(--text-secondary)");
            } else { printLine("ACCESS DENIED // That flag is not valid.", "#ff8b8b", false, "error"); }
            break;

        case "help":
            printLine("Commands: challenge, status, help, whoami, id, pwd, ls [-la], ll, cd <path>, cat <file>, su <user> <password>, sudo -l, hint, submit <flag>, clear");
            break;

        case "clear":
            output.innerHTML = "";
            break;

        case "":
            break;

        default:
            printLine(`bash: ${command}: command not found`);
    }
}

input.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        if (!commandHistory.length) return;
        historyIndex += e.key === "ArrowUp" ? -1 : 1;
        historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex));
        input.value = commandHistory[historyIndex] ? commandHistory[historyIndex] : "";
        input.dispatchEvent(new Event("input"));
        return;
    }
    if (e.key === "Enter") {
        const cmd = input.value.trim();
        if (cmd) { commandHistory.push(cmd); historyIndex = commandHistory.length; }
        printLine(currentUser + "@portfolio:" + displayCwd() + "$ " + cmd, "var(--text-secondary)");
        runCommand(cmd);
        document.querySelector(".prompt").textContent = currentUser + "@portfolio:" + displayCwd() + "$";
        input.value = "";
    }
});

function updateProgress() {
    const complete = capturedFlags.size === CTF_FLAGS.length;
    document.getElementById("ctf-progress").textContent = capturedFlags.size + "/" + CTF_FLAGS.length + " flags" + (complete ? " · PWNED" : "");
}

document.querySelector(".terminal").addEventListener("click", () => input.focus());
document.getElementById("year").textContent = new Date().getFullYear();
window.addEventListener("load", bootSequence);

const nav = document.getElementById("hackerNav");
const navToggle = nav.querySelector(".nav-toggle");
const navMenu = document.getElementById("navMenu");
function toggleNav(force) {
    const active = typeof force === "boolean" ? force : !nav.classList.contains("active");
    nav.classList.toggle("active", active);
    navToggle.setAttribute("aria-expanded", String(active));
    navMenu.setAttribute("aria-hidden", String(!active));
}
navToggle.addEventListener("click", () => toggleNav());
navMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => toggleNav(false)));
document.addEventListener("keydown", e => { if (e.key === "Escape") toggleNav(false); });

