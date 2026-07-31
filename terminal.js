const input = document.getElementById("terminal-command");
const output = document.getElementById("output");

const BANNER = `
░██████╗░░░███╗░░░██████╗░░██████╗
██╔════╝░░████║░░██╔════╝░██╔════╝
██║░░██╗░██╔██║░░██║░░██╗░╚█████╗░
██║░░╚██╗╚═╝██║░░██║░░╚██╗░╚═══██╗
╚██████╔╝███████╗╚██████╔╝██████╔╝
░╚═════╝░╚══════╝░╚═════╝░╚═════╝░`;

let cwd = "~";
let commandHistory = [];
let historyIndex = 0;
const CTF_FLAG = "g1gs{Im_In}";
let ctfSolved = localStorage.getItem("portfolio-ctf-solved") === "true";

const fs = {
  "~": {
    ".operator_note.txt": "OPERATOR NOTE: Backups are never where they should be. Start in projects/ and enumerate hidden entries.",
    "welcome.txt": "Welcome to g1gs's domain. Type 'help' for available commands.",
    "certifications.txt": `
[+] OFFENSIVE SECURITY
    - OSCP+/OSCP (Active Directory, Network Pentesting, Web App Security, Exploit Development, PrivEsc)
    
[+] TCM SECURITY
    - PNPT (Active Directory, Network Pentesting, Web App Security, OWASP Top 10)
    - PJPT (Active Directory, Network Pentesting)

[+] COMPTIA
    - CASP+, Security+, Network+, A+`,
    "skills.conf": `
# Penetration Testing
network_pentest=true
active_directory=true
AV_evasion=true
web_app_security=true
exploit_dev=true

# Active Directory
kerberoasting=true
pass_the_hash=true
bloodhound_analysis=true
AS-REP_roasting=true

# Tools
frameworks=[Metasploit, C2]
tools=[Kali, nxc, Nmap, ligolo, rustscan, feroxbuster, ...]
scripting=[Python, PowerShell, Bash]`,
    "contact.txt": `
---------------------------------------------------------
| GitHub   | https://github.com/ericktafel1             |
| LinkedIn | https://www.linkedin.com/in/ericktafel     |
| HTB      | https://app.hackthebox.com/profile/1321737 |
| Email    | tafel_sec@protonmail.com                       |
---------------------------------------------------------`,
    "usr": {
        "bin": {
            "nmap": "...no",
            "metasploit": "...absolutely not"
        },
        "share": {
            "wordlists": {
                "rockyou.txt": "10 million passwords... Please wait..."
            }
        }
    },
    "projects": {
      "ctf_notes": "Detailed writeups for HTB & TryHackMe. Check GitHub.",
      "azure_honeypot": "Deployed Azure Sentinel honeypot to map live attack vectors.",
      "rpi_security": "Hardware security projects using Raspberry Pi.",
      "auto_scripts.py": "Python & Bash automation for reconnaissance.",
      ".ssh_tunnel": {
            "BackupFiles": {
                "ArchivedPasswords": {
                    "Hashes": {
                        ".README.txt": "g1gs{Im_In}"
                    }
                }
            }
        }
    }
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
    { text: '[+] SPECIALTY="Penetration Testing, Offensive Security"', color: "var(--neon-green)" },
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

function solveChallenge(message) {
    if (!ctfSolved) {
        ctfSolved = true;
        localStorage.setItem("portfolio-ctf-solved", "true");
        updateProgress();
    }
    printLine(message, "#8dffab", false, "success");
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
        const mode = directory ? "drwxr-xr-x" : executable ? "-rwxr-xr-x" : entry.name.startsWith(".") ? "-rw-------" : "-rw-r--r--";
        const links = directory ? 2 : 1;
        const size = directory ? 4096 : new Blob([String(entry.value)]).size;
        const date = index % 2 ? "Jul 30 21:37" : "Jul 31 09:13";
        lines.push(mode + " " + String(links).padStart(2) + " g1gs operators " + String(size).padStart(6) + " " + date + " " + entry.name + (directory ? "/" : ""));
    });
    return lines.join("\n");
}

// Safely get the folder object for current path
function getCurrentFolder() {
    let folder = fs["~"];
    const parts = cwd.split('/').slice(1);
    parts.forEach(part => {
        if (part && folder[part]) folder = folder[part];
    });
    return folder;
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
            printLine(cwd.replace("~", "/home/g1gs"));
            break;

        case "whoami":
            printLine("Erick Tafel - Cybersecurity Engineer | Red Team | Offensive Security");
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

        case "cd":
            if (!pathArg || pathArg === "~") {
                cwd = "~";
            } else if (pathArg === "..") {
                if (cwd !== "~") {
                    const parts = cwd.split("/");
                    parts.pop();
                    cwd = parts.join("/");
                }
            } else {
                const cdFolder = getCurrentFolder();
                if (cdFolder[pathArg] && typeof cdFolder[pathArg] === "object") {
                    cwd = cwd === "~" ? `~/${pathArg}` : `${cwd}/${pathArg}`;
                } else {
                    printLine(`bash: cd: ${pathArg}: No such directory`);
                }
            }
            break;

        case "cat":
            if (!pathArg) {
                printLine("Usage: cat [filename]");
                return;
            }
            const catFolder = getCurrentFolder();
            const content = catFolder[pathArg];

            if (typeof content === "string") {
                printLine(content);
                if (content === CTF_FLAG) solveChallenge("FLAG CAPTURED // Reading the flag completed Operation Breadcrumb.");
            } else if (typeof content === "object") {
                printLine(`cat: ${pathArg}: Is a directory`);
            } else {
                printLine(`cat: ${pathArg}: No such file or directory`);
            }
            break;

        case "hint":
            printLine(cwd === "~" ? "Hint 1/3: Hidden files often begin with a dot. Try ls -la." : cwd.includes("projects") ? "Hint 2/3: Follow the hidden tunnel and keep enumerating." : "Hint 3/3: cat the README, then submit the flag.", "orange");
            break;

        case "challenge":
            printLine("OPERATION BREADCRUMB // Find the flag hidden in this virtual filesystem.\nRules: use terminal commands only. Try: ls, ls -la, ll, cd, cat, pwd, hint, submit <flag>\nNo network requests or real shell commands are executed.", "var(--text-primary)");
            break;

        case "submit":
            if (!pathArg) { printLine("Usage: submit g1gs{...}", "#ff8b8b"); break; }
            if (pathArg === CTF_FLAG) {
                solveChallenge("ACCESS GRANTED // Flag accepted. Nice enumeration, operator.");
            } else { printLine("ACCESS DENIED // That flag is not valid.", "#ff8b8b", false, "error"); }
            break;

        case "help":
            printLine("Commands: challenge, help, whoami, pwd, ls [-la], ll, cd <dir>, cat <file>, hint, submit <flag>, clear");
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
        printLine("g1gs@portfolio:" + cwd + "$ " + cmd, "var(--text-secondary)");
        runCommand(cmd);
        document.querySelector(".prompt").textContent = "g1gs@portfolio:" + cwd + "$";
        input.value = "";
    }
});

function updateProgress() {
    document.getElementById("ctf-progress").textContent = ctfSolved ? "1/1 flags · PWNED" : "0/1 flags";
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

const cmdInput = document.getElementById("terminal-command");

cmdInput.addEventListener("input", function() {
    // 1ch is roughly the width of one character in a monospace font
    this.style.width = (this.value.length + 1) + "ch";
});

// Ensure it resets when command is sent
cmdInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        // ... your existing runCommand(cmd) logic ...
        setTimeout(() => { cmdInput.style.width = "1ch"; }, 10);
    }
});