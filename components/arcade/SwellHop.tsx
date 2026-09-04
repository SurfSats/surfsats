"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const CYAN = 0x3dfff3;
const ORANGE = 0xff7a18;
const DARK = 0x041018;
const BAND = 0x0a2430;
const MID = 0x12384a;
const MAGENTA = 0xff2ec4;

type HopOpts = {
  onWipeout: (score: number) => void;
};

class HopScene extends Phaser.Scene {
  private onWipeout!: (score: number) => void;
  private player!: Phaser.GameObjects.Rectangle;
  private pipes!: Phaser.Physics.Arcade.Group;
  private bands: Phaser.GameObjects.Rectangle[] = [];
  private hint!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private started = false;
  private dead = false;
  private ended = false;
  private runT = 0;
  private scroll = 0;
  private nextSpawn = 2.8;
  private score = 0;
  private hopHint = "TAP TO HOP";

  constructor() {
    super("hop");
  }

  init(data: HopOpts & { hint: string }) {
    this.onWipeout = data.onWipeout;
    this.hopHint = data.hint;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor(DARK);
    this.physics.world.setBounds(0, 0, w, h);

    this.bands = [
      this.add.rectangle(w / 2, h * 0.28, w * 2, 48, BAND).setAlpha(0.85),
      this.add.rectangle(w / 2, h * 0.52, w * 2, 36, MID).setAlpha(0.7),
      this.add.rectangle(w / 2, h * 0.78, w * 2, 64, BAND).setAlpha(0.9),
    ];

    this.pipes = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    const px = Math.max(72, w * 0.2);
    this.player = this.add.rectangle(px, h * 0.45, 22, 22, ORANGE);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0, 0);
    body.setAllowGravity(false);
    body.setMaxVelocity(0, 820);

    this.physics.add.overlap(this.player, this.pipes, () => this.wipeout());

    this.hint = this.add
      .text(w / 2, h * 0.38, this.hopHint, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#efe6d4",
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(16, 14, "000000", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#efe6d4",
      })
      .setOrigin(0, 0);

    this.input.on("pointerdown", () => this.hop());
    this.input.keyboard?.addCapture("SPACE");
    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
      event.preventDefault();
      this.hop();
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      this.hint.setPosition(gameSize.width / 2, gameSize.height * 0.38);
    });

    this.nextSpawn = 2.8;
  }

  hop() {
    if (this.dead) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!this.started) {
      this.started = true;
      body.setAllowGravity(true);
      this.hint.setVisible(false);
    }
    body.setVelocityY(-430);
  }

  private speed() {
    const u = Math.min(1, Math.max(0, this.runT) / 78);
    return 128 + 132 * (u * u);
  }

  private gap() {
    const u = Math.min(1, Math.max(0, this.runT - 8) / 68);
    return 220 - 86 * u;
  }

  private spawnPipe() {
    const w = this.scale.width;
    const h = this.scale.height;
    const gap = this.gap();
    const margin = 48;
    const topH = Phaser.Math.Between(margin, Math.max(margin + 8, h - gap - margin));
    const botY = topH + gap;
    const x = w + 40;
    const top = this.add.rectangle(x, topH / 2, 36, topH, CYAN);
    const bot = this.add.rectangle(x, (h + botY) / 2, 36, h - botY, CYAN);
    const lip = this.add.rectangle(x, topH, 44, 10, ORANGE);
    const lip2 = this.add.rectangle(x, botY, 44, 10, MAGENTA);
    for (const piece of [top, bot, lip, lip2]) {
      this.physics.add.existing(piece);
      const body = piece.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.setVelocityX(-this.speed());
      this.pipes.add(piece);
    }
  }

  wipeout() {
    if (this.dead) return;
    this.dead = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-40, -160);
    this.player.setFillStyle(MAGENTA);
    this.pipes.getChildren().forEach((child) => {
      const body = (child as Phaser.GameObjects.Rectangle).body as
        | Phaser.Physics.Arcade.Body
        | null;
      body?.setVelocityX(0);
    });
    this.time.delayedCall(850, () => {
      if (this.ended) return;
      this.ended = true;
      this.onWipeout(this.score);
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(0.033, delta / 1000);
    const w = this.scale.width;
    const h = this.scale.height;
    this.scroll += (this.started && !this.dead ? this.speed() : 28) * dt;
    this.bands[0]?.setX((w / 2 + this.scroll * 0.15) % (w * 0.4) + w * 0.3);
    this.bands[1]?.setX((w / 2 - this.scroll * 0.28) % (w * 0.5) + w * 0.25);
    this.bands[2]?.setX((w / 2 + this.scroll * 0.45) % (w * 0.35) + w * 0.32);

    if (!this.started || this.dead) return;
    this.runT += dt;
    this.score = Math.floor(this.scroll * 1.4);
    this.scoreText.setText(String(this.score).padStart(6, "0"));

    const speed = this.speed();
    this.pipes.getChildren().forEach((child) => {
      const body = (child as Phaser.GameObjects.Rectangle).body as
        | Phaser.Physics.Arcade.Body
        | null;
      body?.setVelocityX(-speed);
    });

    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      this.spawnPipe();
      const spacing = this.gap() / speed + 0.55 + Math.random() * 0.35;
      this.nextSpawn = Math.max(0.72, spacing);
    }

    this.pipes.getChildren().forEach((child) => {
      const rect = child as Phaser.GameObjects.Rectangle;
      if (rect.x < -60) {
        rect.destroy();
      }
    });

    const py = this.player.y;
    if (py < 12 || py > h - 12) this.wipeout();
  }
}

export function SwellHop({ onWipeout }: { onWipeout: (score: number) => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef(onWipeout);
  endRef.current = onWipeout;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    const hint = coarse ? "TAP TO HOP" : "TAP OR SPACE";

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: "#041018",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 1040 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: host.clientWidth || 390,
        height: host.clientHeight || 640,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: { keyboard: true },
      scene: [HopScene],
      audio: { noAudio: true },
    });

    game.scene.start("hop", {
      onWipeout: (score: number) => endRef.current(score),
      hint,
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="swell-hop-root"
      aria-label="SWELL HOP. Tap or press space to hop."
    />
  );
}
