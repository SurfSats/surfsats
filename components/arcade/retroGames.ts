import type { RetroGameId } from "@/lib/arcade";

export const RETRO_W = 480;
export const RETRO_H = 360;

export type RetroPad = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
};

export function emptyPad(): RetroPad {
  return { left: false, right: false, up: false, down: false, fire: false };
}

type Hooks = {
  pad: RetroPad;
  onGameOver: (score: number) => void;
};

function edge(prev: RetroPad, pad: RetroPad, key: keyof RetroPad) {
  return pad[key] && !prev[key];
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

export function startRetroGame(
  canvas: HTMLCanvasElement,
  game: RetroGameId,
  hooks: Hooks,
): () => void {
  canvas.width = RETRO_W;
  canvas.height = RETRO_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;
  if (game === "pong") return runPong(ctx, hooks);
  if (game === "tetris") return runTetris(ctx, hooks);
  if (game === "snake") return runSnake(ctx, hooks);
  if (game === "breakout") return runBreakout(ctx, hooks);
  return runInvaders(ctx, hooks);
}

function runPong(ctx: CanvasRenderingContext2D, hooks: Hooks) {
  const W = RETRO_W;
  const H = RETRO_H;
  const padW = 8;
  const padH = 64;
  const ball = 8;
  const win = 7;
  let playerY = H / 2 - padH / 2;
  let aiY = H / 2 - padH / 2;
  let pScore = 0;
  let aScore = 0;
  let ended = false;
  let b = serve(1);
  let raf = 0;

  function serve(dir: number) {
    const angle = ((Math.random() * 50 - 25) * Math.PI) / 180;
    return {
      x: W / 2,
      y: H / 2,
      vx: Math.cos(angle) * 220 * dir,
      vy: Math.sin(angle) * 220,
    };
  }

  function hit(px: number, py: number, comingLeft: boolean) {
    if (comingLeft && (b.x > px + padW || b.x + ball < px || b.vx > 0)) return;
    if (!comingLeft && (b.x + ball < px || b.x > px + padW || b.vx < 0)) return;
    if (b.y + ball < py || b.y > py + padH) return;
    b.x = comingLeft ? px + padW : px - ball;
    b.vx = -b.vx * 1.06;
    const pos = (b.y + ball / 2 - py) / padH - 0.5;
    b.vy = pos * 340;
    const speed = Math.min(420, Math.hypot(b.vx, b.vy));
    const ang = Math.atan2(b.vy, b.vx);
    b.vx = Math.cos(ang) * speed;
    b.vy = Math.sin(ang) * speed;
  }

  function update(dt: number) {
    if (ended) return;
    const pad = hooks.pad;
    const speed = 280;
    if (pad.up) playerY = Math.max(0, playerY - speed * dt);
    if (pad.down) playerY = Math.min(H - padH, playerY + speed * dt);
    const aiC = aiY + padH / 2;
    if (aiC < b.y - 6) aiY = Math.min(H - padH, aiY + speed * 0.84 * dt);
    else if (aiC > b.y + 6) aiY = Math.max(0, aiY - speed * 0.84 * dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y <= 0) {
      b.y = 0;
      b.vy *= -1;
    }
    if (b.y >= H - ball) {
      b.y = H - ball;
      b.vy *= -1;
    }
    hit(18, playerY, true);
    hit(W - 26, aiY, false);
    if (b.x < -12) {
      aScore += 1;
      b = serve(1);
    }
    if (b.x > W + 4) {
      pScore += 1;
      b = serve(-1);
    }
    if (pScore >= win || aScore >= win) {
      ended = true;
      hooks.onGameOver(pScore);
    }
  }

  function draw() {
    fill(ctx, 0, 0, W, H, "#030814");
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 8);
    ctx.lineTo(W / 2, H - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    fill(ctx, 18, playerY, padW, padH, "#3dfff3");
    fill(ctx, W - 26, aiY, padW, padH, "#ff2ec4");
    fill(ctx, b.x, b.y, ball, ball, "#ff7a18");
    text(ctx, String(pScore), W / 4, 28, "#3dfff3", 22);
    text(ctx, String(aScore), (W * 3) / 4, 28, "#ff2ec4", 22);
    if (ended) {
      text(ctx, pScore >= win ? "YOU WIN" : "CPU WINS", W / 2, H / 2, "#ff7a18", 22);
    }
  }

  let last = performance.now();
  function loop(now: number) {
    update(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function runTetris(ctx: CanvasRenderingContext2D, hooks: Hooks) {
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 16;
  const ox = Math.floor((RETRO_W - COLS * BLOCK) / 2);
  const oy = 20;
  const SHAPES = [
    [[1, 1, 1, 1]],
    [
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
  ];
  const COLORS = ["#00e8e8", "#c050f0", "#f0a000", "#3050f0", "#e8e020", "#20d040", "#f03030"];
  type Piece = { shape: number[][]; color: string; x: number; y: number };
  const grid = Array.from({ length: ROWS }, () => Array<string | 0>(COLS).fill(0));
  let score = 0;
  let ended = false;
  let drop = 0;
  let interval = 0.85;
  let piece = spawn();
  let prev = emptyPad();
  let raf = 0;
  let das = 0;

  function spawn(): Piece {
    const id = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[id].map((row) => [...row]);
    return {
      shape,
      color: COLORS[id],
      x: Math.floor(COLS / 2 - shape[0].length / 2),
      y: 0,
    };
  }

  function collide(p: Piece, dx: number, dy: number, shape = p.shape) {
    for (let y = 0; y < shape.length; y += 1) {
      for (let x = 0; x < shape[y].length; x += 1) {
        if (!shape[y][x]) continue;
        const nx = p.x + x + dx;
        const ny = p.y + y + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotate(matrix: number[][]) {
    const n = matrix.length;
    const m = matrix[0].length;
    const next = Array.from({ length: m }, () => Array<number>(n).fill(0));
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < m; x += 1) {
        next[x][n - 1 - y] = matrix[y][x];
      }
    }
    return next;
  }

  function merge() {
    for (let y = 0; y < piece.shape.length; y += 1) {
      for (let x = 0; x < piece.shape[y].length; x += 1) {
        if (!piece.shape[y][x]) continue;
        if (piece.y + y < 0) {
          ended = true;
          hooks.onGameOver(score);
          return;
        }
        grid[piece.y + y][piece.x + x] = piece.color;
      }
    }
    let lines = 0;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (grid[y].every(Boolean)) {
        grid.splice(y, 1);
        grid.unshift(Array<string | 0>(COLS).fill(0));
        lines += 1;
        y += 1;
      }
    }
    if (lines) {
      score += lines * lines * 100;
      interval = Math.max(0.12, 0.85 - Math.floor(score / 400) * 0.08);
    }
    piece = spawn();
    if (collide(piece, 0, 0)) {
      ended = true;
      hooks.onGameOver(score);
    }
  }

  function update(dt: number) {
    if (ended) return;
    const pad = hooks.pad;
    if (edge(prev, pad, "left") || (pad.left && (das += dt) > 0.14)) {
      if (!collide(piece, -1, 0)) piece.x -= 1;
      if (pad.left && das > 0.14) das = 0.08;
    } else if (edge(prev, pad, "right") || (pad.right && (das += dt) > 0.14)) {
      if (!collide(piece, 1, 0)) piece.x += 1;
      if (pad.right && das > 0.14) das = 0.08;
    } else if (!pad.left && !pad.right) {
      das = 0;
    }
    if (edge(prev, pad, "up") || edge(prev, pad, "fire")) {
      const rotated = rotate(piece.shape);
      if (!collide(piece, 0, 0, rotated)) piece.shape = rotated;
    }
    drop += pad.down ? dt * 14 : dt;
    if (drop >= interval) {
      drop = 0;
      if (!collide(piece, 0, 1)) piece.y += 1;
      else merge();
    }
    prev = { ...pad };
  }

  function draw() {
    fill(ctx, 0, 0, RETRO_W, RETRO_H, "#07070c");
    fill(ctx, ox - 3, oy - 3, COLS * BLOCK + 6, ROWS * BLOCK + 6, "#101018");
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = grid[y][x];
        if (cell) fill(ctx, ox + x * BLOCK, oy + y * BLOCK, BLOCK - 1, BLOCK - 1, cell);
      }
    }
    if (!ended) {
      for (let y = 0; y < piece.shape.length; y += 1) {
        for (let x = 0; x < piece.shape[y].length; x += 1) {
          if (!piece.shape[y][x]) continue;
          fill(
            ctx,
            ox + (piece.x + x) * BLOCK,
            oy + (piece.y + y) * BLOCK,
            BLOCK - 1,
            BLOCK - 1,
            piece.color,
          );
        }
      }
    }
    text(ctx, `SCORE ${score}`, RETRO_W / 2, 10, "#3dfff3", 11);
    if (ended) text(ctx, "GAME OVER", RETRO_W / 2, RETRO_H / 2, "#ff7a18", 20);
  }

  let last = performance.now();
  function loop(now: number) {
    update(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function runSnake(ctx: CanvasRenderingContext2D, hooks: Hooks) {
  const TILE = 20;
  const COLS = 24;
  const ROWS = 16;
  const ox = (RETRO_W - COLS * TILE) / 2;
  const oy = 24;
  const snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];
  let dir = { x: 1, y: 0 };
  let next = { x: 1, y: 0 };
  let food = place();
  let score = 0;
  let ended = false;
  let acc = 0;
  let step = 0.14;
  let prev = emptyPad();
  let raf = 0;

  function place() {
    let pos = { x: 0, y: 0 };
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function update(dt: number) {
    if (ended) return;
    const pad = hooks.pad;
    if ((edge(prev, pad, "up") || pad.up) && dir.y !== 1) next = { x: 0, y: -1 };
    if ((edge(prev, pad, "down") || pad.down) && dir.y !== -1) next = { x: 0, y: 1 };
    if ((edge(prev, pad, "left") || pad.left) && dir.x !== 1) next = { x: -1, y: 0 };
    if ((edge(prev, pad, "right") || pad.right) && dir.x !== -1) next = { x: 1, y: 0 };
    acc += dt;
    if (acc >= step) {
      acc = 0;
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (
        head.x < 0 ||
        head.x >= COLS ||
        head.y < 0 ||
        head.y >= ROWS ||
        snake.some((s) => s.x === head.x && s.y === head.y)
      ) {
        ended = true;
        hooks.onGameOver(score);
      } else {
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10;
          food = place();
          step = Math.max(0.06, 0.14 - score / 800);
        } else {
          snake.pop();
        }
      }
    }
    prev = { ...pad };
  }

  function draw() {
    fill(ctx, 0, 0, RETRO_W, RETRO_H, "#041006");
    fill(ctx, food.x * TILE + ox + 3, food.y * TILE + oy + 3, TILE - 6, TILE - 6, "#ff2ec4");
    snake.forEach((seg, i) => {
      fill(
        ctx,
        seg.x * TILE + ox + 1,
        seg.y * TILE + oy + 1,
        TILE - 2,
        TILE - 2,
        i === 0 ? "#7cffb2" : "#1f8a4a",
      );
    });
    text(ctx, `SCORE ${score}`, RETRO_W / 2, 12, "#7cffb2", 11);
    if (ended) text(ctx, "GAME OVER", RETRO_W / 2, RETRO_H / 2, "#ff7a18", 20);
  }

  let last = performance.now();
  function loop(now: number) {
    update(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function runBreakout(ctx: CanvasRenderingContext2D, hooks: Hooks) {
  const W = RETRO_W;
  const H = RETRO_H;
  const pw = 72;
  const ph = 10;
  const br = 5;
  const cols = 10;
  const rows = 5;
  const bw = 42;
  const bh = 12;
  let paddle = W / 2 - pw / 2;
  let ball = { x: W / 2, y: H - 48, vx: 180, vy: -200 };
  let lives = 3;
  let score = 0;
  let ended = false;
  let bricks: { x: number; y: number; live: boolean; color: string }[] = [];
  let raf = 0;

  function level() {
    bricks = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        bricks.push({
          x: 18 + c * (bw + 4),
          y: 40 + r * (bh + 4),
          live: true,
          color: `hsl(${r * 42 + 12} 80% 58%)`,
        });
      }
    }
    ball = { x: paddle + pw / 2, y: H - 42, vx: 180 * (Math.random() > 0.5 ? 1 : -1), vy: -210 };
  }

  level();

  function update(dt: number) {
    if (ended) return;
    const pad = hooks.pad;
    const speed = 340;
    if (pad.left) paddle = Math.max(8, paddle - speed * dt);
    if (pad.right) paddle = Math.min(W - pw - 8, paddle + speed * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < br) {
      ball.x = br;
      ball.vx *= -1;
    }
    if (ball.x > W - br) {
      ball.x = W - br;
      ball.vx *= -1;
    }
    if (ball.y < br) {
      ball.y = br;
      ball.vy *= -1;
    }
    if (
      ball.y + br >= H - 28 &&
      ball.y - br <= H - 28 + ph &&
      ball.x >= paddle &&
      ball.x <= paddle + pw &&
      ball.vy > 0
    ) {
      ball.vy = -Math.abs(ball.vy);
      ball.vx = ((ball.x - (paddle + pw / 2)) / (pw / 2)) * 240;
    }
    if (ball.y > H + 8) {
      lives -= 1;
      if (lives <= 0) {
        ended = true;
        hooks.onGameOver(score);
      } else {
        ball = { x: paddle + pw / 2, y: H - 42, vx: 180, vy: -210 };
      }
    }
    let live = 0;
    for (const brick of bricks) {
      if (!brick.live) continue;
      live += 1;
      if (
        ball.x > brick.x &&
        ball.x < brick.x + bw &&
        ball.y > brick.y &&
        ball.y < brick.y + bh
      ) {
        brick.live = false;
        ball.vy *= -1;
        score += 10;
        live -= 1;
      }
    }
    if (live <= 0) level();
  }

  function draw() {
    fill(ctx, 0, 0, W, H, "#050510");
    fill(ctx, paddle, H - 28, pw, ph, "#3dfff3");
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, br, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    for (const brick of bricks) {
      if (brick.live) fill(ctx, brick.x, brick.y, bw, bh, brick.color);
    }
    text(ctx, `LIVES ${lives}   SCORE ${score}`, W / 2, 16, "#d7f4ff", 11);
    if (ended) text(ctx, "GAME OVER", W / 2, H / 2, "#ff7a18", 20);
  }

  let last = performance.now();
  function loop(now: number) {
    update(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function runInvaders(ctx: CanvasRenderingContext2D, hooks: Hooks) {
  const W = RETRO_W;
  const H = RETRO_H;
  const pw = 28;
  const ph = 12;
  const cols = 8;
  const rows = 4;
  let playerX = W / 2 - pw / 2;
  let bullets: { x: number; y: number }[] = [];
  let enemyShots: { x: number; y: number }[] = [];
  let aliens: { x: number; y: number; row: number; live: boolean }[] = [];
  let score = 0;
  let lives = 3;
  let ended = false;
  let cool = 0;
  let moveT = 0;
  let dir = 1;
  let drop = false;
  let raf = 0;
  const colors = ["#ff2ec4", "#ff7a18", "#ffe600", "#3dfff3"];

  function spawn() {
    aliens = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        aliens.push({
          x: 36 + c * 48,
          y: 44 + r * 28,
          row: r,
          live: true,
        });
      }
    }
  }

  spawn();

  function update(dt: number) {
    if (ended) return;
    const pad = hooks.pad;
    cool = Math.max(0, cool - dt);
    if (pad.left) playerX = Math.max(8, playerX - 220 * dt);
    if (pad.right) playerX = Math.min(W - pw - 8, playerX + 220 * dt);
    if ((pad.fire || pad.up) && cool <= 0 && bullets.length < 3) {
      bullets.push({ x: playerX + pw / 2, y: H - 42 });
      cool = 0.28;
    }
    bullets = bullets.filter((b) => {
      b.y -= 280 * dt;
      return b.y > 0;
    });
    const alive = aliens.filter((a) => a.live);
    const interval = Math.max(0.18, 0.72 - alive.length * 0.012);
    moveT += dt;
    if (moveT > interval) {
      moveT = 0;
      if (drop) {
        aliens.forEach((a) => {
          a.y += 14;
        });
        drop = false;
      } else {
        aliens.forEach((a) => {
          a.x += dir * 10;
        });
        if (alive.length) {
          const right = Math.max(...alive.map((a) => a.x + 28));
          const left = Math.min(...alive.map((a) => a.x));
          if (right >= W - 10 || left <= 8) {
            dir *= -1;
            drop = true;
          }
        }
      }
    }
    if (alive.length && Math.random() < 0.018) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      enemyShots.push({ x: shooter.x + 14, y: shooter.y + 18 });
    }
    enemyShots = enemyShots.filter((b) => {
      b.y += 140 * dt;
      return b.y < H;
    });
    bullets = bullets.filter((b) => {
      let hit = false;
      for (const a of aliens) {
        if (!a.live) continue;
        if (b.x > a.x && b.x < a.x + 28 && b.y > a.y && b.y < a.y + 18) {
          a.live = false;
          score += 10 * (4 - a.row);
          hit = true;
          break;
        }
      }
      return !hit;
    });
    enemyShots = enemyShots.filter((b) => {
      if (b.x > playerX && b.x < playerX + pw && b.y > H - 36 && b.y < H - 36 + ph) {
        lives -= 1;
        if (lives <= 0) {
          ended = true;
          hooks.onGameOver(score);
        }
        return false;
      }
      return true;
    });
    if (!ended && alive.some((a) => a.y + 18 >= H - 40)) {
      ended = true;
      hooks.onGameOver(score);
    }
    if (aliens.every((a) => !a.live)) spawn();
  }

  function draw() {
    fill(ctx, 0, 0, W, H, "#02050c");
    fill(ctx, playerX + 10, H - 42, 8, 10, "#3dfff3");
    fill(ctx, playerX, H - 32, pw, 8, "#3dfff3");
    for (const b of bullets) fill(ctx, b.x - 1, b.y, 3, 10, "#fff");
    for (const b of enemyShots) fill(ctx, b.x - 1, b.y, 3, 8, "#ff2a2a");
    for (const a of aliens) {
      if (!a.live) continue;
      fill(ctx, a.x + 6, a.y, 16, 6, colors[a.row]);
      fill(ctx, a.x + 2, a.y + 6, 24, 8, colors[a.row]);
    }
    text(ctx, `LIVES ${lives}   SCORE ${score}`, W / 2, 14, "#d7f4ff", 11);
    if (ended) text(ctx, "GAME OVER", W / 2, H / 2, "#ff7a18", 20);
  }

  let last = performance.now();
  function loop(now: number) {
    update(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
