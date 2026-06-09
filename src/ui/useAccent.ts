import { useEffect, useState } from "react";

const fallback = { primary: "#1ed760", muted: "#122f25", text: "#f8fff9" };

export function useAccent(imageUrl?: string) {
  const [accent, setAccent] = useState(fallback);

  useEffect(() => {
    if (!imageUrl) {
      setAccent(fallback);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      canvas.width = 24;
      canvas.height = 24;
      context.drawImage(image, 0, 0, 24, 24);
      const { data } = context.getImageData(0, 0, 24, 24);
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;

      for (let index = 0; index < data.length; index += 16) {
        const alpha = data[index + 3];
        if (alpha < 128) continue;
        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
        samples += 1;
      }

      if (!samples) return;
      const color = `rgb(${Math.round(red / samples)}, ${Math.round(
        green / samples,
      )}, ${Math.round(blue / samples)})`;
      setAccent({ primary: color, muted: color, text: "#ffffff" });
    };
  }, [imageUrl]);

  return accent;
}
