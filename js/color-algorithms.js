// K-Means Clustering Color Extraction
class ColorExtractor {
  constructor() {
    this.maxIterations = 20;
    this.sampleSize = 10000;
  }

  extractColors(imageData, colorCount, newVariation = false) {
    const pixels = this.samplePixels(imageData, newVariation);
    const clusters = this.kMeans(pixels, colorCount, newVariation);
    return this.formatResults(clusters);
  }

  samplePixels(imageData, newVariation = false) {
    const pixels = [];
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // For variations, use different sampling offset and step
    let step = Math.max(1, Math.floor(totalPixels / this.sampleSize));
    let startOffset = 0;

    if (newVariation) {
      // Randomize the sampling pattern for variations
      step = Math.max(1, Math.floor(totalPixels / this.sampleSize) + Math.floor(Math.random() * 3) - 1);
      startOffset = Math.floor(Math.random() * step * 4);
    }

    for (let i = startOffset; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      // Skip very light or very dark pixels (optional, for better results)
      const brightness = (r + g + b) / 3;
      if (brightness < 10 || brightness > 245) continue;

      pixels.push([r, g, b]);
    }

    // For variations, shuffle the pixels array to change clustering behavior
    if (newVariation && pixels.length > 0) {
      for (let i = pixels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pixels[i], pixels[j]] = [pixels[j], pixels[i]];
      }
    }

    return pixels;
  }

  kMeans(pixels, k, newVariation = false) {
    if (pixels.length === 0) {
      return Array(k).fill().map(() => ({ center: [128, 128, 128], count: 0 }));
    }

    // Initialize centroids using k-means++ method (with randomization for variations)
    let centroids = this.initializeCentroids(pixels, k, newVariation);
    let assignments = new Array(pixels.length);
    let counts = new Array(k).fill(0);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Assign pixels to nearest centroid
      let changed = false;
      counts.fill(0);

      for (let i = 0; i < pixels.length; i++) {
        const nearest = this.findNearestCentroid(pixels[i], centroids);
        if (assignments[i] !== nearest) {
          assignments[i] = nearest;
          changed = true;
        }
        counts[nearest]++;
      }

      if (!changed) break;

      // Update centroids
      const newCentroids = Array(k).fill().map(() => [0, 0, 0]);

      for (let i = 0; i < pixels.length; i++) {
        const cluster = assignments[i];
        newCentroids[cluster][0] += pixels[i][0];
        newCentroids[cluster][1] += pixels[i][1];
        newCentroids[cluster][2] += pixels[i][2];
      }

      for (let j = 0; j < k; j++) {
        if (counts[j] > 0) {
          centroids[j] = [
            Math.round(newCentroids[j][0] / counts[j]),
            Math.round(newCentroids[j][1] / counts[j]),
            Math.round(newCentroids[j][2] / counts[j])
          ];
        }
      }
    }

    return centroids.map((center, i) => ({
      center,
      count: counts[i]
    }));
  }

  initializeCentroids(pixels, k, newVariation = false) {
    const centroids = [];
    const usedIndices = new Set();

    if (newVariation) {
      // For variations, use completely random initialization instead of k-means++
      // This gives very different starting points and thus different final clusters
      const shuffledIndices = [...Array(pixels.length).keys()];
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }

      for (let i = 0; i < k && i < shuffledIndices.length; i++) {
        centroids.push([...pixels[shuffledIndices[i]]]);
      }
      return centroids;
    }

    // Standard k-means++ initialization for first run
    // First centroid: random
    const firstIndex = Math.floor(Math.random() * pixels.length);
    centroids.push([...pixels[firstIndex]]);
    usedIndices.add(firstIndex);

    // Remaining centroids: k-means++
    for (let i = 1; i < k; i++) {
      const distances = pixels.map((pixel, idx) => {
        if (usedIndices.has(idx)) return 0;
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.colorDistance(pixel, centroid);
          minDist = Math.min(minDist, dist);
        }
        return minDist;
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDist;
      let selectedIndex = 0;

      for (let j = 0; j < distances.length; j++) {
        random -= distances[j];
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }

      centroids.push([...pixels[selectedIndex]]);
      usedIndices.add(selectedIndex);
    }

    return centroids;
  }

  findNearestCentroid(pixel, centroids) {
    let minDist = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = this.colorDistance(pixel, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  colorDistance(c1, c2) {
    // Weighted Euclidean distance (accounts for human color perception)
    const rMean = (c1[0] + c2[0]) / 2;
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];

    const rWeight = 2 + rMean / 256;
    const gWeight = 4;
    const bWeight = 2 + (255 - rMean) / 256;

    return Math.sqrt(rWeight * dr * dr + gWeight * dg * dg + bWeight * db * db);
  }

  formatResults(clusters) {
    const totalCount = clusters.reduce((sum, c) => sum + c.count, 0);

    return clusters
      .filter(c => c.count > 0)
      .map(c => ({
        rgb: c.center,
        hex: this.rgbToHex(c.center),
        percentage: totalCount > 0 ? (c.count / totalCount * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  }

  rgbToHex([r, g, b]) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // Convert RGB to HSL
  rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  // Convert HSL to RGB
  hslToRgb([h, s, l]) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Generate tints (lighter versions)
  generateTints(rgb, count = 4) {
    const tints = [];
    for (let i = 1; i <= count; i++) {
      const factor = i / (count + 1);
      tints.push([
        Math.round(rgb[0] + (255 - rgb[0]) * factor),
        Math.round(rgb[1] + (255 - rgb[1]) * factor),
        Math.round(rgb[2] + (255 - rgb[2]) * factor)
      ]);
    }
    return tints;
  }

  // Generate shades (darker versions)
  generateShades(rgb, count = 4) {
    const shades = [];
    for (let i = 1; i <= count; i++) {
      const factor = 1 - (i / (count + 1));
      shades.push([
        Math.round(rgb[0] * factor),
        Math.round(rgb[1] * factor),
        Math.round(rgb[2] * factor)
      ]);
    }
    return shades;
  }

  // Generate complementary color
  generateComplementary(rgb) {
    const hsl = this.rgbToHsl(rgb);
    hsl[0] = (hsl[0] + 180) % 360;
    return this.hslToRgb(hsl);
  }

  // Generate analogous colors
  generateAnalogous(rgb) {
    return this.generateAnalogousWithOffset(rgb, 0);
  }

  // Generate analogous colors with angle offset
  generateAnalogousWithOffset(rgb, offset = 0) {
    const hsl = this.rgbToHsl(rgb);
    const baseAngle = 30 + offset;
    const colors = [];
    colors.push(this.hslToRgb([(hsl[0] - baseAngle + 360) % 360, hsl[1], hsl[2]]));
    colors.push(rgb);
    colors.push(this.hslToRgb([(hsl[0] + baseAngle) % 360, hsl[1], hsl[2]]));
    return colors;
  }

  // Generate triadic colors
  generateTriadic(rgb) {
    return this.generateTriadicWithOffset(rgb, 0);
  }

  // Generate triadic colors with angle offset
  generateTriadicWithOffset(rgb, offset = 0) {
    const hsl = this.rgbToHsl(rgb);
    const angle = 120 + offset;
    return [
      rgb,
      this.hslToRgb([(hsl[0] + angle) % 360, hsl[1], hsl[2]]),
      this.hslToRgb([(hsl[0] + angle * 2) % 360, hsl[1], hsl[2]])
    ];
  }

  // Generate split-complementary colors
  generateSplitComplementary(rgb) {
    return this.generateSplitComplementaryWithOffset(rgb, 0);
  }

  // Generate split-complementary colors with angle offset
  generateSplitComplementaryWithOffset(rgb, offset = 0) {
    const hsl = this.rgbToHsl(rgb);
    const angle = 150 + offset;
    return [
      rgb,
      this.hslToRgb([(hsl[0] + angle) % 360, hsl[1], hsl[2]]),
      this.hslToRgb([(hsl[0] + (360 - angle) + 180) % 360, hsl[1], hsl[2]])
    ];
  }

  // Generate tetradic (square) colors
  generateTetradic(rgb, offset = 0) {
    const hsl = this.rgbToHsl(rgb);
    const angle = 90 + offset;
    return [
      rgb,
      this.hslToRgb([(hsl[0] + angle) % 360, hsl[1], hsl[2]]),
      this.hslToRgb([(hsl[0] + angle * 2) % 360, hsl[1], hsl[2]]),
      this.hslToRgb([(hsl[0] + angle * 3) % 360, hsl[1], hsl[2]])
    ];
  }
}
