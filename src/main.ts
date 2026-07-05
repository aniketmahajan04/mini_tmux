import process from "node:process";

const rows = process.stdout.rows || 24;
const cols = process.stdout.columns || 90;

interface ScreenCell {
  char: string;
  fg?: number;
  bg?: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pane {
  id: number;
  rect: Rect;
  cursor: {
    x: number;
    // y: number;
  };
  inputBuffer: string;
  history: string[];
}

interface GlobalState {
  // cursor: {
  //   x: number;
  //   y: number;
  // };
  // inputBuffer: string;
  // terminalHistory: string[];
  panes: Pane[];
  activePanes: number;
  isRawMode: boolean;
}
const state: GlobalState = {
  panes: [
    {
      id: 0,
      rect: {
        x: 0,
        y: 0,
        width: Math.floor(cols / 2),
        height: rows - 1,
      },
      cursor: {
        x: 2,
        // y: 1,
      },
      inputBuffer: "",
      history: [],
    },
    {
      id: 1,
      rect: {
        x: Math.floor(cols / 2),
        y: 0,
        width: cols - Math.floor(cols / 2),
        height: rows - 1,
      },
      cursor: {
        x: 1,
        // y: 1,
      },
      inputBuffer: "",
      history: [],
    },
  ],
  activePanes: 0,
  isRawMode: true,
};

class Screen {
  width: number;
  height: number;
  cell: ScreenCell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cell = [];

    for (let y = 0; y < height; y++) {
      const row: ScreenCell[] = [];

      for (let x = 0; x < width; x++) {
        row.push({ char: " " });
      }

      this.cell.push(row);
    }
  }
}
let previousScreen: Screen | null = null;
function keyHandler(key: string, state: GlobalState) {
  const pane = state.panes[state.activePanes]!;
  if (key === `q` || key === "\u0003") {
    // \u0003 is hex value for Ctrl+c
    console.log("Exiting raw mode");

    process.stdin.setRawMode(false);
    process.exit(0);
  }

  // This handle Enter key to execute commands
  if (key === "\r" || key === "\n") {
    const command = pane?.inputBuffer.trim().toLowerCase();

    pane?.history.push(`${pane.inputBuffer}`);
    if (command === "clear") {
      pane.history = [];
      pane.cursor.x = 2;
      // pane.cursor.y = 1;
    } else if (command !== "") {
      pane.history.push(`Undefind command!: "${command}"`);
      // pane.cursor.y = pane.cursor.y += 1;
    }
    pane.inputBuffer = "";
    // pane.cursor.y = pane.cursor.y += 1;
    pane.cursor.x = 2;
    return;
  }

  // This handles the backspace to modify the inputBuffer written
  if (key === "\x7F" || key === "\b") {
    if (pane.inputBuffer.length > 0) {
      pane.inputBuffer = pane.inputBuffer.slice(0, -1);

      // process.stdin.write("\b \b");
      pane.cursor.x = Math.max(2, pane.cursor.x - 1);
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
    ["\x1B[A", "\x1B[B", "\x1B[C", "\x1B[D"].includes(key)
    // state.inputBuffer.length === 0
  ) {
    // if (key === "\x1B[A") pane.cursor.y = Math.max(1, pane.cursor.y - 1);
    // if (key === "\x1B[B") pane.cursor.y++;
    if (key === "\x1B[C")
      pane.cursor.x = Math.min(pane.inputBuffer.length + 1, pane.cursor.x + 1);
    if (key === "\x1B[D") pane.cursor.x = Math.max(2, pane.cursor.x - 1);

    // moveTerminalCursor(state.cursor.y, state.cursor.x);

    return;
  }

  // This will avoid escape codes and arrow key to print and only accept standard printable characters
  if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 162) {
    pane.inputBuffer += key;
    pane.cursor.x++;
  }
}

function drawAt(
  screen: Screen,
  x: number,
  y: number,
  char: string,
  fg?: number,
  bg?: number,
) {
  // process.stdout.write(`\x1B[${y + 1};${x + 1}H`);
  // process.stdout.write(text);
  if (x < 0 || x >= screen.width || y < 0 || y >= screen.height) return;
  screen.cell[y][x] = {
    char,
    fg,
    bg,
  };
}

function drawText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  fg?: number,
  bg?: number,
) {
  for (let i = 0; i < text.length; i++) {
    drawAt(screen, x + i, y, text[i]!, fg, bg);
  }
}

function drawBorder(screen: Screen, rect: Rect) {
  drawAt(screen, rect.x, rect.y, "┌");
  drawAt(screen, rect.x + rect.width - 1, rect.y, "┐");

  drawAt(screen, rect.x, rect.y + rect.height - 1, "└");
  drawAt(screen, rect.x + rect.width - 1, rect.y + rect.height - 1, "┘");

  for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
    drawAt(screen, x, rect.y, "─");
  }

  for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
    drawAt(screen, x, rect.y + rect.height - 1, "─");
  }

  for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
    drawAt(screen, rect.x, y, "│");
  }
  for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
    drawAt(screen, rect.x + rect.width - 1, y, "│");
  }
}

function drawPane(screen: Screen, pane: Pane) {
  drawBorder(screen, pane.rect);
  const maxTerminalHistory = pane.rect.height - 2;
  const linesToPrint = pane.history.slice(-maxTerminalHistory);

  for (let i = 0; i < linesToPrint.length; i++) {
    const row = pane.rect.y + i + 1;
    const col = pane.rect.x + 1;
    // process.stdout.write(`\x1B[${row};${col}H`);
    // process.stdout.write(`${linesToPrint[i]}`);
    drawText(screen, col, row, linesToPrint[i]!);
  }
  // Draw current input on the next line
  const inputRow = pane.rect.y + linesToPrint.length + 1;
  const inputCol = pane.rect.x + 1;

  // process.stdout.write(`\x1B[${inputRow};${inputCol}H`);
  // process.stdout.write(`${pane.inputBuffer}`);
  drawText(screen, inputCol, inputRow, pane.inputBuffer);
}

function drawStatusBar(screen: Screen, state: GlobalState) {
  const rows = process.stdout.rows || 24;
  const columns = process.stdout.columns || 90;
  const pane = state.panes[state.activePanes]!;

  const greenBg = "\x1B[42m\x1B[30m";
  const resetStyles = "\x1B[0m";

  // Construct a status string padded to fill the entire width of the terminal window
  const statusText = ` [${pane.id}] mini-tmux * |  Buffer: ${pane.inputBuffer.length}`;
  const paddedStatus = statusText.padEnd(columns, " ");

  // Move absolute cursor to the very last line, column 1
  // process.stdout.write(`\x1B[${rows};1H`);

  // Write styled bar
  // process.stdout.write(`${greenBg}${paddedStatus}${resetStyles}`);
  drawText(screen, 0, rows - 1, paddedStatus, 30, 42);
}

function placeCursor(state: GlobalState) {
  const pane = state.panes[state.activePanes]!;

  const row =
    pane.rect.y + pane.history.slice(-(pane.rect.height - 2)).length + 2;
  const col = pane.rect.x + pane.cursor.x;
  process.stdout.write(`\x1B[${row};${col}H`);
}

function flush(screen: Screen) {
  if (previousScreen === null) {
    process.stdout.write("\x1B[2J\x1B[H");
    for (let y = 0; y < screen.height; y++) {
      // let line = "";
      for (let x = 0; x < screen.width; x++) {
        const cell = screen.cell[y]![x]!;

        if (cell.fg !== undefined) {
          process.stdout.write(`\x1B[${cell.fg}m`);
        }

        if (cell.bg !== undefined) {
          process.stdout.write(`\x1B[${cell.bg}m`);
        }

        process.stdout.write(cell.char);

        process.stdout.write("\x1B[0m");
      }

      // process.stdout.write(line);
      if (y < screen.height - 1) {
        process.stdout.write("\n");
      }
    }
    previousScreen = screen;
    return;
  }
  previousScreen = screen;
}

function renderer(state: GlobalState) {
  const screen = new Screen(cols, rows);
  // Clear screen and draw static instructions

  for (const pane of state.panes) {
    drawPane(screen, pane);
  }

  drawStatusBar(screen, state);
  flush(screen);
  placeCursor(state);
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
