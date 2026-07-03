import process from "node:process";

interface GlobalState {
  cursor: {
    x: number;
    y: number;
  };
  inputBuffer: string;
  message: string;
  isRawMode: boolean;
}
const state: GlobalState = {
  cursor: {
    x: 1,
    y: 3,
  },
  inputBuffer: "",
  message: "",
  isRawMode: true,
};

function moveTerminalCursor(row: number, col: number) {
  // \x1B[ is the Control Sequence Introducer (CSI)
  // \x1B[${row};${col}H moves the cursor to absolute position
  process.stdout.write(`\x1B[${col};${row}H`);
}

function keyHandler(key: string, state: GlobalState) {
  if (key === `q` || key === "\u0003") {
    // \u0003 is hex value for Ctrl+c
    console.log("Exiting raw mode");

    process.stdin.setRawMode(false);
    process.exit(0);
  }

  // This handle Enter key to execute commands
  if (key === "\r" || key === "\n") {
    const command = state.inputBuffer.trim().toLowerCase();

    if (command === "clear") {
      // process.stdout.write("\x1b[2J\x1b[H");

      state.message = "";
      state.cursor.x = 1;
      state.cursor.y = 3;
    } else if (command !== "") {
      state.message = `Undefind command!: "${command}\n`;
      // process.stdout.write(`\nUndefined command!: "${state.inputBuffer}"\n`);
    }
    state.inputBuffer = "";
    state.cursor.y = state.cursor.y + 1;
    state.cursor.x = 1;
    return;
  }

  // This handles the backspace to modify the inputBuffer written
  if (key === "\x7F" || key === "\b") {
    if (state.inputBuffer.length > 0) {
      state.inputBuffer = state.inputBuffer.slice(0, -1);

      // process.stdin.write("\b \b");
      state.cursor.x = Math.max(1, state.cursor.x - 1);
    }
    return;
  }

  // Handling the Arrow keys
  // In raw mode Arrow keys sent as 3-bytes escape sequece
  // Up: \x1b[A
  // Down: \x1b[B
  // Right: \x1b[C
  // Left: \x1b[D
  if (
    ["\x1B[A", "\x1B[B", "\x1B[C", "\x1B[D"].includes(key) &&
    state.inputBuffer.length === 0
  ) {
    if (key === "\x1B[A") state.cursor.y = Math.max(3, state.cursor.y - 1);
    if (key === "\x1B[B") state.cursor.y++;
    if (key === "\x1B[C") state.cursor.x++;
    if (key === "\x1B[D") state.cursor.x = Math.max(1, state.cursor.x - 1);

    moveTerminalCursor(state.cursor.y, state.cursor.x);

    return;
  }

  // console.log(`Received key: ${JSON.stringify(key)}`);
  // This will avoid escape codes and arrow key to print and only accept standard printable characters
  if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 162) {
    state.inputBuffer += key;
    // process.stdin.write(key);
    state.cursor.x++;
    // state.message = "";
  }
}

function renderer(terminalState: GlobalState) {
  // Clear screen and draw static instructions
  process.stdout.write("\x1B[2J\x1B[H");
  process.stdout.write("--- MINI TMUX ---\n");
  process.stdout.write(
    "Type 'clear' to clear the screen. Use Arrow keys to move.\n",
  );
  process.stdout.write(`${terminalState.message}`);
  process.stdout.write(`${terminalState.inputBuffer}`);
  process.stdout.write(
    `\x1B[${terminalState.cursor.y};${terminalState.cursor.x}H`,
  );
}
function main() {
  // This will check if stdin is actual terminal (TTY)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    // it will resume the stdin to start reading
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
  }

  renderer(state);
  process.stdin.on("data", (key: string) => {
    keyHandler(key, state);
    renderer(state);
  });
}

main();
