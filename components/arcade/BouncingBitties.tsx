"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const SKY = 0xb4dcf0;
const MAGENTA = 0xff2ec4;

const PLAYER_IDLE = "/arcade/bitties/player-idle.png";
const PLAYER_JUMP = "/arcade/bitties/player-jump.png";
const PLAYER_HIT = "/arcade/bitties/player-hit.png";
const BLOCK_SRC = "/arcade/bitties/block.png";
const SPIKE_SRC = "/arcade/bitties/spike.png";
const COIN_SRC = "/arcade/bitties/coin.png";
const HILLS_SRC = "/arcade/bitties/bg-hills.png";
const CLOUDS_SRC = "/arcade/bitties/bg-clouds.png";
const SFX_HOP = "/arcade/bitties/sfx/hop.ogg";
const SFX_PICKUP = "/arcade/bitties/sfx/pickup.ogg";
const SFX_HIT = "/arcade/bitties/sfx/hit.ogg";

const MAX_HAZARDS = 20;
const MAX_PICKUPS = 6;
const GATE_HAZARDS = 4;
const SPAWN_SKIP_MS = 50;
const CLOUDS_H = 148;
const HILLS_H = 138;

type BounceOpts = {
  onWipeout: (score: number) => void;
};

class BounceScene extends Phaser.Scene {
  private onWipeout!: (score: number) => void;
  private player!: Phaser.Physics.Arcade.Sprite;
  private hazards!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private hills!: Phaser.GameObjects.TileSprite;
  private clouds!: Phaser.GameObjects.TileSprite;
  private hint!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private started = false;
  private dead = false;
  private ended = false;
  private runT = 0;
  private scroll = 0;
  private nextSpawn = 2.8;
  private score = 0;
  private hopHint = "TAP TO BOUNCE";

  constructor() {
    super("bounce");
  }

  init(data: BounceOpts & { hint: string }) {
    this.onWipeout = data.onWipeout;
    this.hopHint = data.hint;
  }

  preload() {
    this.load.image("player-idle", PLAYER_IDLE);
    this.load.image("player-jump", PLAYER_JUMP);
    this.load.image("player-hit", PLAYER_HIT);
    this.load.image("block", BLOCK_SRC);
    this.load.image("spike", SPIKE_SRC);
    this.load.image("coin", COIN_SRC);
    this.load.image("hills", HILLS_SRC);
    this.load.image("clouds", CLOUDS_SRC);
    this.load.audio("hop", SFX_HOP);
    this.load.audio("pickup", SFX_PICKUP);
    this.load.audio("hit", SFX_HIT);
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor(SKY);
    this.physics.world.setBounds(0, 0, w, h);

    this.clouds = this.add
      .tileSprite(w / 2, Math.max(CLOUDS_H / 2, h * 0.26), w, CLOUDS_H, "clouds")
      .setDepth(0);
    this.hills = this.add
      .tileSprite(w / 2, h - HILLS_H / 2, w, HILLS_H, "hills")
      .setDepth(1);

    this.hazards = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      maxSize: MAX_HAZARDS,
    });
    this.pickups = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      maxSize: MAX_PICKUPS,
    });

    const px = Math.max(72, w * 0.2);
    const bitty = Math.round(Math.max(56, Math.min(72, w * 0.16)));
    this.player = this.physics.add.sprite(px, h * 0.45, "player-idle");
    this.player.setDisplaySize(bitty, bitty);
    this.player.setDepth(4);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.player.width * 0.46, this.player.height * 0.52);
    body.setOffset(this.player.width * 0.27, this.player.height * 0.3);
    body.setCollideWorldBounds(true);
    body.setBounce(0, 0);
    body.setAllowGravity(false);
    body.setMaxVelocity(0, 820);

    this.physics.add.overlap(this.player, this.hazards, () => this.wipeout());
    this.physics.add.overlap(this.player, this.pickups, (_player, coin) => {
      const sprite = coin as Phaser.Physics.Arcade.Image;
      if (!sprite.active) return;
      this.score += 50;
      this.beep("pickup");
      sprite.destroy(true);
    });

    this.hint = this.add
      .text(w / 2, h * 0.38, this.hopHint, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#142028",
      })
      .setOrigin(0.5)
      .setDepth(8);

    this.scoreText = this.add
      .text(16, 14, "000000", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#142028",
      })
      .setOrigin(0, 0)
      .setDepth(8);

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
      this.clouds.setPosition(
        gameSize.width / 2,
        Math.max(CLOUDS_H / 2, gameSize.height * 0.26),
      );
      this.clouds.setSize(gameSize.width, CLOUDS_H);
      this.hills.setPosition(gameSize.width / 2, gameSize.height - HILLS_H / 2);
      this.hills.setSize(gameSize.width, HILLS_H);
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
    this.player.setTexture("player-jump");
    this.beep("hop");
  }

  private beep(key: "hop" | "pickup" | "hit") {
    if (this.sound.locked) this.sound.unlock();
    try {
      this.sound.play(key, { volume: 0.42 });
    } catch {
      // autoplay lock — next tap unlocks
    }
  }

  private speed() {
    const u = Math.min(1, Math.max(0, this.runT) / 78);
    return 128 + 132 * (u * u);
  }

  private gap() {
    const u = Math.min(1, Math.max(0, this.runT - 8) / 68);
    return 220 - 86 * u;
  }

  private armHazard(sprite: Phaser.Physics.Arcade.Image) {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setVelocityX(-this.speed());
    this.hazards.add(sprite);
  }

  private placeColumn(x: number, y0: number, y1: number) {
    const h = Math.max(12, y1 - y0);
    const block = this.physics.add.image(x, y0 + h / 2, "block");
    block.setDisplaySize(46, h);
    block.setDepth(2);
    const body = block.body as Phaser.Physics.Arcade.Body;
    body.setSize(block.width * 0.84, block.height * 0.92);
    body.setOffset(block.width * 0.08, block.height * 0.04);
    this.armHazard(block);
  }

  private spawnPipe() {
    if (this.hazards.countActive(true) + GATE_HAZARDS > MAX_HAZARDS) return false;

    const w = this.scale.width;
    const h = this.scale.height;
    const gap = this.gap();
    const margin = 52;
    const topH = Phaser.Math.Between(
      margin,
      Math.max(margin + 8, h - gap - margin),
    );
    const botY = topH + gap;
    const x = w + 48;

    this.placeColumn(x, 0, topH);
    this.placeColumn(x, botY, h);

    const topSpike = this.physics.add.image(x, topH + 2, "spike");
    topSpike.setDisplaySize(38, 28);
    topSpike.setFlipY(true);
    topSpike.setOrigin(0.5, 0);
    topSpike.setDepth(3);
    const topBody = topSpike.body as Phaser.Physics.Arcade.Body;
    topBody.setSize(topSpike.width * 0.7, topSpike.height * 0.62);
    topBody.setOffset(topSpike.width * 0.15, topSpike.height * 0.2);
    this.armHazard(topSpike);

    const botSpike = this.physics.add.image(x, botY - 2, "spike");
    botSpike.setDisplaySize(38, 28);
    botSpike.setOrigin(0.5, 1);
    botSpike.setDepth(3);
    const botBody = botSpike.body as Phaser.Physics.Arcade.Body;
    botBody.setSize(botSpike.width * 0.7, botSpike.height * 0.62);
    botBody.setOffset(botSpike.width * 0.15, botSpike.height * 0.18);
    this.armHazard(botSpike);

    if (this.pickups.countActive(true) < MAX_PICKUPS) {
      const coin = this.physics.add.image(x, topH + gap / 2, "coin");
      coin.setDisplaySize(22, 22);
      coin.setDepth(3);
      const coinBody = coin.body as Phaser.Physics.Arcade.Body;
      coinBody.setAllowGravity(false);
      coinBody.setImmovable(true);
      coinBody.setVelocityX(-this.speed());
      const sr = coin.width * 0.36;
      coinBody.setCircle(sr, (coin.width - sr * 2) / 2, (coin.height - sr * 2) / 2);
      this.pickups.add(coin);
    }
    return true;
  }

  private sweepOffscreen() {
    const killLeft = (child: Phaser.GameObjects.GameObject) => {
      const img = child as Phaser.Physics.Arcade.Image;
      if (img.x < -80) img.destroy(true);
    };
    const hazards = this.hazards.getChildren();
    for (let i = hazards.length - 1; i >= 0; i--) killLeft(hazards[i]);
    const pickups = this.pickups.getChildren();
    for (let i = pickups.length - 1; i >= 0; i--) killLeft(pickups[i]);
  }

  wipeout() {
    if (this.dead) return;
    this.dead = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-40, -160);
    this.player.setTexture("player-hit");
    this.player.setTint(MAGENTA);
    this.beep("hit");
    const stop = (child: Phaser.GameObjects.GameObject) => {
      const body = (child as Phaser.Physics.Arcade.Image).body as
        | Phaser.Physics.Arcade.Body
        | null;
      body?.setVelocityX(0);
    };
    this.hazards.getChildren().forEach(stop);
    this.pickups.getChildren().forEach(stop);
    this.time.delayedCall(850, () => {
      if (this.ended) return;
      this.ended = true;
      this.onWipeout(this.score);
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(0.033, delta / 1000);
    const h = this.scale.height;
    this.scroll += (this.started && !this.dead ? this.speed() : 28) * dt;
    this.clouds.tilePositionX = this.scroll * 0.12;
    this.hills.tilePositionX = this.scroll * 0.32;

    if (this.player?.body && !this.dead) {
      const vy = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;
      this.player.setRotation(Phaser.Math.Clamp(vy / 2200, -0.18, 0.28));
      if (this.started && vy > 80) this.player.setTexture("player-idle");
    }

    if (!this.started || this.dead) return;
    this.runT += dt;
    this.score = Math.max(this.score, Math.floor(this.scroll * 1.4));
    this.scoreText.setText(String(this.score).padStart(6, "0"));

    const speed = this.speed();
    const push = (child: Phaser.GameObjects.GameObject) => {
      const body = (child as Phaser.Physics.Arcade.Image).body as
        | Phaser.Physics.Arcade.Body
        | null;
      body?.setVelocityX(-speed);
    };
    this.hazards.getChildren().forEach(push);
    this.pickups.getChildren().forEach(push);

    this.sweepOffscreen();

    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      if (delta > SPAWN_SKIP_MS) {
        this.nextSpawn = 0.35;
      } else {
        this.spawnPipe();
        const spacing = this.gap() / speed + 0.55 + Math.random() * 0.35;
        this.nextSpawn = Math.max(0.72, spacing);
      }
    }

    const py = this.player.y;
    if (py < 12 || py > h - 12) this.wipeout();
  }
}

export function BouncingBitties({
  onWipeout,
}: {
  onWipeout: (score: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef(onWipeout);
  const gameRef = useRef<Phaser.Game | null>(null);
  endRef.current = onWipeout;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    const hint = coarse ? "TAP TO BOUNCE" : "TAP OR SPACE";
    let alive = true;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: "#b4dcf0",
      fps: { target: 60, min: 30, smoothStep: true },
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
      scene: [],
    });
    gameRef.current = game;

    game.scene.add("bounce", BounceScene, true, {
      onWipeout: (score: number) => {
        if (!alive) return;
        endRef.current(score);
      },
      hint,
    });

    return () => {
      alive = false;
      gameRef.current = null;
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="bitties-root"
      aria-label="BOUNCING BITTIES. Tap or press space to bounce."
    />
  );
}
