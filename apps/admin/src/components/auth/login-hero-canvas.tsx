"use client";

import { useEffect, useRef } from "react";
import { usePreferences } from "@/src/components/providers/preferences-provider";

type ThemeMode = "light" | "dark" | "system";

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkle: number;
};

type Dust = {
  arm: number;
  angle: number;
  radius: number;
  offset: number;
  size: number;
  alpha: number;
};

function resolveTheme(theme: ThemeMode) {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function createRadialGradientFill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colors: [number, string][],
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  for (const [stop, color] of colors) {
    gradient.addColorStop(stop, color);
  }
  return gradient;
}

export function LoginHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = usePreferences();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resolvedTheme = resolveTheme(theme);
    const stars: Star[] = [];
    const dusts: Dust[] = [];

    const updateTheme = () => {
      resolvedTheme = resolveTheme(theme);
    };

    const createScene = () => {
      stars.length = 0;
      dusts.length = 0;

      const starCount = Math.max(72, Math.floor((width * height) / 11000));
      for (let index = 0; index < starCount; index += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 0.5 + Math.random() * 1.5,
          alpha: 0.16 + Math.random() * 0.52,
          twinkle: Math.random() * Math.PI * 2,
        });
      }

      const armCount = 3;
      const dustCount = Math.max(320, Math.floor(width * 0.62));
      for (let index = 0; index < dustCount; index += 1) {
        dusts.push({
          arm: index % armCount,
          angle: Math.random() * Math.PI * 2,
          radius: Math.pow(Math.random(), 0.74) * Math.min(width, height) * 0.32,
          offset: (Math.random() - 0.5) * 0.3,
          size: 0.7 + Math.random() * 2.1,
          alpha: 0.06 + Math.random() * 0.36,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      createScene();
    };

    const drawMist = () => {
      const galaxyCenterX = width * 0.34;
      const galaxyCenterY = height * 0.48;

      const mainMist = createRadialGradientFill(context, galaxyCenterX, galaxyCenterY, width * 0.34, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.085)"
            : "rgba(0,0,0,0.045)",
        ],
        [0.4, resolvedTheme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)"],
        [1, "rgba(0,0,0,0)"],
      ]);
      context.fillStyle = mainMist;
      context.fillRect(0, 0, width, height);

      const secondaryMist = createRadialGradientFill(context, width * 0.68, height * 0.28, width * 0.22, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
        ],
        [1, "rgba(0,0,0,0)"],
      ]);
      context.fillStyle = secondaryMist;
      context.fillRect(0, 0, width, height);
    };

    const drawStars = (time: number) => {
      for (const star of stars) {
        const pulse = 0.84 + Math.sin(time * 0.00022 + star.twinkle) * 0.16;
        const alpha = star.alpha * pulse;
        context.fillStyle =
          resolvedTheme === "dark"
            ? `rgba(255,255,255,${alpha})`
            : `rgba(0,0,0,${alpha * 0.7})`;
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawGalaxy = (time: number) => {
      const centerX = width * 0.34;
      const centerY = height * 0.48;
      const rotation = time * 0.000045;
      const armGap = (Math.PI * 2) / 3;

      for (const dust of dusts) {
        const spin = dust.angle + dust.arm * armGap + dust.radius * 0.035 + rotation;
        const orbitRadiusX = dust.radius * 1.28;
        const orbitRadiusY = dust.radius * 0.48;
        const swirlX = Math.cos(spin) * orbitRadiusX;
        const swirlY = Math.sin(spin) * orbitRadiusY;
        const tangentX = Math.cos(spin + Math.PI / 2) * dust.offset * dust.radius * 0.32;
        const tangentY = Math.sin(spin + Math.PI / 2) * dust.offset * dust.radius * 0.18;
        const x = centerX + swirlX + tangentX;
        const y = centerY + swirlY + tangentY;

        const alphaBase = dust.alpha * (1 - dust.radius / (Math.min(width, height) * 0.42));
        context.fillStyle =
          resolvedTheme === "dark"
            ? `rgba(255,255,255,${Math.max(0.02, alphaBase)})`
            : `rgba(0,0,0,${Math.max(0.015, alphaBase * 0.72)})`;
        context.beginPath();
        context.arc(x, y, dust.size, 0, Math.PI * 2);
        context.fill();
      }

      const core = createRadialGradientFill(context, centerX, centerY, Math.min(width, height) * 0.12, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.95)"
            : "rgba(0,0,0,0.28)",
        ],
        [
          0.42,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.16)"
            : "rgba(0,0,0,0.07)",
        ],
        [1, "rgba(0,0,0,0)"],
      ]);
      context.fillStyle = core;
      context.fillRect(0, 0, width, height);
    };

    const drawOrbitBands = (time: number) => {
      const centerX = width * 0.34;
      const centerY = height * 0.48;
      const bandRotation = time * 0.00006;

      context.save();
      context.translate(centerX, centerY);
      context.rotate(-0.34);

      for (const size of [0.2, 0.29, 0.38]) {
        context.beginPath();
        context.ellipse(
          0,
          0,
          width * size,
          height * size * 0.38,
          0,
          0,
          Math.PI * 2,
        );
        context.strokeStyle =
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.065)"
            : "rgba(0,0,0,0.05)";
        context.lineWidth = 0.9;
        context.stroke();
      }

      context.restore();

      const planetTrackX = centerX + Math.cos(bandRotation) * width * 0.24;
      const planetTrackY = centerY + Math.sin(bandRotation) * height * 0.09;
      context.fillStyle =
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.68)"
          : "rgba(0,0,0,0.42)";
      context.beginPath();
      context.arc(planetTrackX, planetTrackY, 2.5, 0, Math.PI * 2);
      context.fill();
    };

    const drawPlanetSystem = (time: number) => {
      const planetX = width * 0.72 + Math.cos(time * 0.00012) * 5;
      const planetY = height * 0.29 + Math.sin(time * 0.0001) * 4;
      const planetRadius = Math.min(width, height) * 0.064;

      const planetGlow = createRadialGradientFill(context, planetX, planetY, planetRadius * 2.8, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.14)"
            : "rgba(0,0,0,0.075)",
        ],
        [1, "rgba(0,0,0,0)"],
      ]);
      context.fillStyle = planetGlow;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(planetX, planetY);
      context.rotate(-0.34);
      context.strokeStyle =
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.14)"
          : "rgba(0,0,0,0.1)";
      context.lineWidth = 1.6;
      context.beginPath();
      context.ellipse(0, 0, planetRadius * 1.95, planetRadius * 0.5, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      const planetFill = createRadialGradientFill(context, planetX - planetRadius * 0.32, planetY - planetRadius * 0.26, planetRadius * 1.5, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.94)"
            : "rgba(255,255,255,0.92)",
        ],
        [
          0.48,
          resolvedTheme === "dark"
            ? "rgba(196,196,196,0.9)"
            : "rgba(186,186,186,0.9)",
        ],
        [
          1,
          resolvedTheme === "dark"
            ? "rgba(88,88,88,0.95)"
            : "rgba(104,104,104,0.95)",
        ],
      ]);
      context.fillStyle = planetFill;
      context.beginPath();
      context.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.translate(planetX, planetY);
      context.rotate(-0.34);
      context.strokeStyle =
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.34)"
          : "rgba(0,0,0,0.2)";
      context.lineWidth = 2.1;
      context.beginPath();
      context.ellipse(
        0,
        0,
        planetRadius * 1.95,
        planetRadius * 0.5,
        0,
        Math.PI * 0.08,
        Math.PI * 0.92,
      );
      context.stroke();
      context.restore();

      const moonAngle = time * 0.00022;
      const moonX = planetX + Math.cos(moonAngle) * planetRadius * 2.3;
      const moonY = planetY + Math.sin(moonAngle) * planetRadius * 0.95;
      context.strokeStyle =
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.1)"
          : "rgba(0,0,0,0.07)";
      context.lineWidth = 0.9;
      context.beginPath();
      context.ellipse(planetX, planetY, planetRadius * 2.3, planetRadius * 0.95, 0, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle =
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.82)"
          : "rgba(0,0,0,0.52)";
      context.beginPath();
      context.arc(moonX, moonY, planetRadius * 0.18, 0, Math.PI * 2);
      context.fill();

      const farPlanetX = width * 0.56 + Math.sin(time * 0.00008) * 6;
      const farPlanetY = height * 0.74 + Math.cos(time * 0.00006) * 5;
      const farPlanetFill = createRadialGradientFill(context, farPlanetX, farPlanetY, planetRadius * 0.95, [
        [
          0,
          resolvedTheme === "dark"
            ? "rgba(255,255,255,0.48)"
            : "rgba(0,0,0,0.22)",
        ],
        [1, "rgba(0,0,0,0)"],
      ]);
      context.fillStyle = farPlanetFill;
      context.fillRect(0, 0, width, height);
      context.fillStyle =
        resolvedTheme === "dark"
          ? "rgba(214,214,214,0.9)"
          : "rgba(82,82,82,0.72)";
      context.beginPath();
      context.arc(farPlanetX, farPlanetY, planetRadius * 0.24, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      drawMist();
      drawStars(time);
      drawGalaxy(time);
      drawOrbitBands(time);
      drawPlanetSystem(time);
      frameId = window.requestAnimationFrame(draw);
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => updateTheme();

    updateTheme();
    resize();
    frameId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    media.addEventListener("change", handleMediaChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", handleMediaChange);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
