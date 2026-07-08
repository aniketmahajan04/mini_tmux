import process from "node:process";
import os from "node:os";
import pty from "node-pty";

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

const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

class TerminalBuffer {
  cursorX = 0;
  cursorY = 0;

  cells: ScreenCell[][];

  write(data: string) {
    // interpret bytes
  }
}
interface Pane {
  id: string;
  rect: Rect;
  pty: pty.IPty;
  terminal: TerminalBuffer;
}
interface GlobalState {
  panes: Pane[];
  activePanes: number;
  isRawMode: boolean;
}

function createPanes(id: string, rect: Rect): Pane {
  try {
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: rect.width,
      rows: rect.height - 1,
      cwd: process.env.HOME,
      env: process.env as { [key: string]: string },
    });

    const newPane: Pane = {
      id,
      rect,
      pty: ptyProcess,
      // inputBuffer: "",
      terminal: new TerminalBuffer(),
    };

    ptyProcess.onData((data: string) => {
      // const cleanData = data.replace(/\r/g, "");
      // const chunks = cleanData.split("\n");
      // for (const chunk of chunks) {
      //   if (chunk.trim()) newPane.history.push(chunk);
      // }
      newPane.terminal.write(data);
      renderer(state);
    });

    return newPane;
  } catch (error: unknown) {
    console.error("Failed to create pty process, ", error);
  }
}

const state: GlobalState = {
  panes: [
    createPanes("pane-1", {
      x: 0,
      y: 0,
      width: cols,
      height: rows - 1,
    }),
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
// function keyHandler(key: string, state: GlobalState) {
//   const pane = state.panes[state.activePanes]!;
//   if (key === `q` || key === "\u0003") {
//     // \u0003 is hex value for Ctrl+c
//     console.log("Exiting raw mode");
//
//     process.stdin.setRawMode(false);
//     process.exit(0);
//   }

// This handle Enter key to execute commands
// if (key === "\r" || key === "\n") {
//   pane?.history.push(`${pane.inputBuffer}`);
//   if (command === "clear") {
//     pane.history = [];
//     pane.cursor.x = 2;
//     // pane.cursor.y = 1;
//   } else if (command !== "") {
//     pane.history.push(`Undefind command!: "${command}"`);
//     // pane.cursor.y = pane.cursor.y += 1;
//   }
//   pane.inputBuffer = "";
//   // pane.cursor.y = pane.cursor.y += 1;
//   pane.cursor.x = 2;
//   return;
// }

// This handles the backspace to modify the inputBuffer written
// if (key === "\x7F" || key === "\b") {
//   if (pane.inputBuffer.length > 0) {
//     pane.inputBuffer = pane.inputBuffer.slice(0, -1);
//
//     // process.stdin.write("\b \b");
//     pane.cursor.x = Math.max(2, pane.cursor.x - 1);
//   }
//   return;
// }

// Handling the Arrow keys
// In raw mode Arrow keys sent as 3-bytes escape sequece
// Up: \x1b[A
// Down: \x1b[B
// Right: \x1b[C
// Left: \x1b[D
// if (
//   ["\x1B[A", "\x1B[B", "\x1B[C", "\x1B[D"].includes(key)
//   // state.inputBuffer.length === 0
// ) {
//   // if (key === "\x1B[A") pane.cursor.y = Math.max(1, pane.cursor.y - 1);
//   // if (key === "\x1B[B") pane.cursor.y++;
//   if (key === "\x1B[C")
//     pane.cursor.x = Math.min(pane.inputBuffer.length + 1, pane.cursor.x + 1);
//   if (key === "\x1B[D") pane.cursor.x = Math.max(2, pane.cursor.x - 1);
//
//   // moveTerminalCursor(state.cursor.y, state.cursor.x);
//
//   return;
// }

// This will avoid escape codes and arrow key to print and only accept standard printable characters
// if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 162) {
//   pane.inputBuffer += key;
//   pane.cursor.x++;
// }
// }

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
  screen.cell[y]![x]! = {
    char,
    fg,
    bg,
  };
}

function drawText(
  screen: Screen,
  text: string,
  x: number,
  y: number,
  fg?: number,
  bg?: number,
) {
  for (let i = 0; i < text.length; i++) {
    drawAt(screen, x + i, y, text[i]!, fg, bg);
  }
}

function drawBorder(screen: Screen, rect: Rect) {
  // drawAt(screen, rect.x, rect.y, "┌");
  // drawAt(screen, rect.x + rect.width - 1, rect.y, "┐");

  // drawAt(screen, rect.x, rect.y + rect.height - 1, "└");
  // drawAt(screen, rect.x + rect.width - 1, rect.y + rect.height - 1, "┘");

  // for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
  //   drawAt(screen, x, rect.y, "─");
  // }

  // for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
  //   drawAt(screen, x, rect.y + rect.height - 1, "─");
  // }

  for (let y = rect.y; y < rect.height; y++) {
    drawAt(screen, Math.floor(rect.width / 2), y, "│");
  }
  // for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
  //   drawAt(screen, rect.x + rect.width - 1, y, "│");
  // }
}

function drawPane(screen: Screen, pane: Pane) {
  drawBorder(screen, pane.rect);
  // const maxTerminalHistory = pane.rect.height - 2;
  // const linesToPrint = pane.history.slice(-maxTerminalHistory);

  // for (let i = 0; i < linesToPrint.length; i++) {
  //   const row = pane.rect.y + i + 1;
  //   const col = pane.rect.x + 1;
  //   // process.stdout.write(`\x1B[${row};${col}H`);
  //   // process.stdout.write(`${linesToPrint[i]}`);
  //   drawText(screen, col, row, linesToPrint[i]!);
  // }
  // Draw current input on the next line
  // const inputRow = pane.rect.y + linesToPrint.length + 1;
  // const inputCol = pane.rect.x + 1;

  // process.stdout.write(`\x1B[${inputRow};${inputCol}H`);
  // process.stdout.write(`${pane.inputBuffer}`);
  for (let y = 0; y < pane.rect.height; y++) {
    for (let x = 0; x < pane.rect.width; x++) {
      const cell = pane.terminal.cells[y]!.[x]!;
      if (cell) {
        const globalX = pane.rect.x + x;
        const globalY = pane.rect.y + y;
        drawAt(screen, globalX, globalY, cell.char, cell.fg, cell.bg);
      }
    }
  }
}

function drawStatusBar(screen: Screen, state: GlobalState) {
  const rows = process.stdout.rows || 24;
  const columns = process.stdout.columns || 90;
  const pane = state.panes[state.activePanes]!;

  // Construct a status string padded to fill the entire width of the terminal window
  const statusText = ` [${pane.id}] mini-tmux * | `;
  const paddedStatus = statusText.padEnd(columns, " ");

  // Write styled bar
  // process.stdout.write(`${greenBg}${paddedStatus}${resetStyles}`);
  drawText(screen, paddedStatus, 0, rows - 1, 30, 42);
}

function placeCursor(state: GlobalState) {
  const pane = state.panes[state.activePanes]!;

  const row = pane.rect.y + pane.terminal.cursorY + 1;
  const col = pane.rect.x + pane.terminal.cursorX;
  process.stdout.write(`\x1B[${row};${col}H`);
}

function sameCell(a: ScreenCell, b: ScreenCell) {
  return a.char === b.char && a.fg === b.fg && a.bg === b.fg;
}

function moveCursor(x: number, y: number) {
  process.stdout.write(`\x1B[${y + 1};${x + 1}H`);
}

function writeCell(cell: ScreenCell) {
  if (cell.fg !== undefined) process.stdout.write(`\x1B[${cell.fg}m`);

  if (cell.bg !== undefined) process.stdout.write(`\x1B[${cell.bg}m`);

  process.stdout.write(cell.char);
  process.stdout.write("\x1B[0m");
}

function drawWholeScreen(screen: Screen) {
  // This will clear the screen
  process.stdout.write("\x1B[2J\x1B[H");

  // writing the cell from previousScreen to screen
  for (let y = 0; y < screen.height; y++) {
    // let line = "";
    moveCursor(0, y);
    for (let x = 0; x < screen.width; x++) {
      const cell = screen.cell[y]![x]!;

      writeCell(cell);
    }

    moveCursor(0, y + 1);
  }
}

function drawTheDiff(previousScreen: Screen, screen: Screen) {
  for (let y = 0; y < previousScreen.height; y++) {
    for (let x = 0; x < previousScreen.width; x++) {
      const oldCell = previousScreen.cell[y]![x]!;
      const newCell = screen.cell[y]![x]!;
      if (sameCell(oldCell, newCell)) {
        continue;
      }
      moveCursor(x, y);
      writeCell(newCell);
    }
  }
}

function flush(screen: Screen) {
  if (previousScreen === null) {
    drawWholeScreen(screen);
  }

  if (previousScreen !== null) {
    drawTheDiff(previousScreen, screen);
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
  // placeCursor(state);
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
    const pane = state.panes[state.activePanes]!;
    // keyHandler(key, state);
    if (pane) {
      // Exit condition handling hook checks catch
      if (key === `\u0003`) {
        // Ctrl+C close mechanism path
        process.stdout.write("\x1B[2J\x1B[H");
        console.log("Exiting mini-tmux layout session safely");
        process.stdin.setRawMode(false);
        process.exit(0);
      }
      pane.pty.write(key);
    }
  });
}

main();
