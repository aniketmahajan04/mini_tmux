import process from "node:process";

interface GlobalState {
  cursor: {
    x: number;
    y: number;
  };
  inputBuffer: string;
  terminalHistory: string[];
  isRawMode: boolean;
}
const state: GlobalState = {
  cursor: {
    x: 1,
    y: 3,
  },
  inputBuffer: "",
  terminalHistory: [],
  isRawMode: true,
};

function moveTerminalCursor(row: number, col: number) {
  // \x1B[ is the Control Sequence Introducer (CSI)
  // \x1B[${row};${col}H moves the cursor to absolute position
  process.stdout.write(`\x1B[${row};${col}H`);
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

    state.terminalHistory.push(`${state.inputBuffer}`);
    if (command === "clear") {
      state.terminalHistory = [];
      state.cursor.x = 1;
      state.cursor.y = 3;
    } else if (command !== "") {
      state.terminalHistory.push(`Undefind command!: "${command}"`);
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

  // This will avoid escape codes and arrow key to print and only accept standard printable characters
  if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 162) {
    state.inputBuffer += key;
    state.cursor.x++;
  }
}

function renderer(terminalState: GlobalState) {
  const totalRows = process.stdout.rows || 24;
  const totalCols = process.stdout.columns || 80;

  // Clear screen and draw static instructions
  process.stdout.write("\x1B[2J\x1B[H");

  // 2. Print history lines (Limit them so they don't overflow into our status bar)
  // Max lines = total screen space minus the active prompt line and minus the status bar line
  const maxTerminalHistory = totalRows - 4;
  const linesToPrint = terminalState.terminalHistory.slice(-maxTerminalHistory);

  process.stdout.write("--- MINI TMUX ---\n");
  process.stdout.write(
    "Type 'clear' to clear the screen. Use Arrow keys to move.\n",
  );

  for (const line of linesToPrint) {
    process.stdout.write(line + "\n");
  }
  process.stdout.write(`${terminalState.inputBuffer}`);

  const greenBg = "\x1B[42m\x1B[30m";
  const resetStyles = "\x1B[0m";

  // Construct a status string padded to fill the entire width of the terminal window
  const statusText = ` [0] mini-tmux * |  State: Raw Mode  |  Buffer: ${terminalState.inputBuffer.length} chars`;
  const paddedStatus = statusText.padEnd(totalCols, " ");

  // Move absolute cursor to the very last line, column 1
  process.stdout.write(`\x1B[${totalRows};1H`);

  // Write styled bar
  process.stdout.write(`${greenBg}${paddedStatus}${resetStyles}`);

  // MOVE CURSOR BACK TO TYPING POSITION
  // Compute exactly where the user was typing so the flashing cursor jumps back up seamlessly
  const currentPromptedRow = 1 + 2 + linesToPrint.length;
  const currentPromptedCol = terminalState.inputBuffer.length + 1;

  process.stdout.write(`\x1B[${currentPromptedRow};${currentPromptedCol}H`);
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

  // Re-render if user resizes their terminal window to keep the status bar locked to bottom
  process.stdout.on("resize", () => {
    renderer(state);
  });

  process.stdin.on("data", (key: string) => {
    keyHandler(key, state);
    renderer(state);
  });
}

main();
