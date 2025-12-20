# Color Palette Generator

A web app that generates color palettes from images and base colors using K-Means clustering algorithm and color wheel.

## Usage

1. Open `index.html` in a web browser
2. Upload an image, add base colors using the "Add Color" button
3. Adjust the number of colors if required
4. Click "Generate Palette" to generate palette

## How It Works

The application uses the K-Means clustering algorithm to analyze image pixels and group them into distinct color clusters. The process includes:

1. **Sampling**: Randomly samples up to 10,000 pixels from the uploaded image
2. **Filtering**: Removes transparent, very light, or very dark pixels for better results
3. **Clustering**: Groups similar colors using K-Means++ initialization
4. **Color Theory**: Generates harmonious color variations based on color wheel relationships

## Run App

[Color Palette Generator](https://onlycodeblog.github.io/color-palette-generator/)
