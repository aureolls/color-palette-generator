// Main Application
class PaletteGenerator {
  constructor() {
    this.extractor = new ColorExtractor();
    this.currentPalette = [];
    this.currentImage = null;
    this.baseColors = []; // Store user-defined base colors

    this.initElements();
    this.initEventListeners();
    this.initializeBaseColors(); // Initialize with no colors
  }

  initElements() {
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.imagePreview = document.getElementById('imagePreview');
    this.previewImg = document.getElementById('previewImg');
    this.changeImageBtn = document.getElementById('changeImageBtn');
    this.removeImageBtn = document.getElementById('removeImageBtn');
    this.controls = document.getElementById('controls');
    this.colorCount = document.getElementById('colorCount');
    this.generateBtn = document.getElementById('generateBtn');
    this.paletteGrid = document.getElementById('paletteGrid');
    this.emptyState = document.getElementById('emptyState');
    this.loading = document.getElementById('loading');
    this.progressBar = document.getElementById('progressBar');
    this.loadingText = document.getElementById('loadingText');
    this.exportBtn = document.getElementById('exportBtn');
    this.regenerateBtn = document.getElementById('regenerateBtn');
    this.toggleVariationsBtn = document.getElementById('toggleVariationsBtn');
    this.toast = document.getElementById('toast');
    this.hiddenCanvas = document.getElementById('hiddenCanvas');
    this.ctx = this.hiddenCanvas.getContext('2d');

    // Track variations visibility state
    this.variationsVisible = false;

    // Modal elements
    this.modalOverlay = document.getElementById('modalOverlay');
    this.modalClose = document.getElementById('modalClose');
    this.exportOptions = document.querySelectorAll('.export-option');
    this.exportPreview = document.getElementById('exportPreview');
    this.copyExportBtn = document.getElementById('copyExportBtn');

    // Custom select elements
    this.customSelect = document.getElementById('customSelect');
    this.customSelectTrigger = this.customSelect.querySelector('.custom-select-trigger');
    this.customSelectValue = this.customSelect.querySelector('.custom-select-value');
    this.customSelectOptions = this.customSelect.querySelectorAll('.custom-select-option');

    // Base colors elements
    this.baseColorsList = document.getElementById('baseColorsList');
    this.addColorBtn = document.getElementById('addColorBtn');
  }

  initEventListeners() {
    // Drag and drop
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

    // File input
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Change image
    this.changeImageBtn.addEventListener('click', () => this.fileInput.click());

    // Remove image
    this.removeImageBtn.addEventListener('click', () => this.removeImage());

    // Generate
    this.generateBtn.addEventListener('click', () => this.generatePalette());

    // Regenerate with new variation
    this.regenerateBtn.addEventListener('click', () => this.generatePalette(true));

    // Toggle variations
    this.toggleVariationsBtn.addEventListener('click', () => this.toggleAllVariations());

    // Export
    this.exportBtn.addEventListener('click', () => this.openExportModal());
    this.modalClose.addEventListener('click', () => this.closeExportModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeExportModal();
    });

    this.exportOptions.forEach(option => {
      option.addEventListener('click', () => this.selectExportFormat(option.dataset.format));
    });

    this.copyExportBtn.addEventListener('click', () => this.copyExport());

    // Custom select
    this.customSelectTrigger.addEventListener('click', () => this.toggleCustomSelect());
    this.customSelectOptions.forEach(option => {
      option.addEventListener('click', () => this.selectCustomOption(option));
    });

    // Close custom select when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.customSelect.contains(e.target)) {
        this.customSelect.classList.remove('open');
      }
    });

    // Base colors
    this.addColorBtn.addEventListener('click', () => this.addBaseColor());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.dropZone.classList.add('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImage(file);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImage = new Image();
      this.currentImage.onload = () => {
        this.showImagePreview(e.target.result);
        this.generatePalette();
      };
      this.currentImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showImagePreview(src) {
    this.previewImg.src = src;
    this.dropZone.style.display = 'none';
    this.imagePreview.classList.add('active');
    this.showControls();
  }

  showControls() {
    this.controls.style.display = 'block';
  }

  removeImage() {
    // Clear the current image
    this.currentImage = null;
    this.previewImg.src = '';

    // Hide image preview and show drop zone
    this.imagePreview.classList.remove('active');
    this.dropZone.style.display = 'block';

    // Clear file input
    this.fileInput.value = '';

    // Hide controls if no base colors exist
    if (this.baseColors.length === 0) {
      this.controls.style.display = 'none';
    }

    // Clear the palette
    this.currentPalette = [];
    this.paletteGrid.innerHTML = '';
    this.emptyState.style.display = 'block';
    this.exportBtn.style.display = 'none';
    this.regenerateBtn.style.display = 'none';
    this.toggleVariationsBtn.style.display = 'none';

    this.showToast('Image removed');
  }

  generatePalette(newVariation = false) {
    const hasImage = !!this.currentImage;
    const hasBaseColors = this.baseColors.length > 0;

    // Need at least one input method
    if (!hasImage && !hasBaseColors) {
      this.showToast('Please upload an image or add base colors');
      return;
    }

    this.showLoading(true, newVariation);

    // Reset harmony state for fresh generation
    if (!newVariation) {
      this.harmonyBaseIndex = 0;
      this.harmonyAngleOffset = 0;
    }

    // Determine generation mode
    if (hasImage && hasBaseColors) {
      // Hybrid mode: Lock base colors and fill rest from image
      this.generateHybridPalette(newVariation);
    } else if (hasImage) {
      // Image only mode
      this.generateFromImage(newVariation);
    } else {
      // Base colors only mode
      this.generateFromBaseColors(newVariation);
    }
  }

  generateFromImage(newVariation) {
    // Animate progress bar smoothly
    this.animateProgress(0, 30, 200).then(() => {
      // Draw image to canvas
      const maxSize = 200;
      const scale = Math.min(maxSize / this.currentImage.width, maxSize / this.currentImage.height, 1);
      const width = Math.floor(this.currentImage.width * scale);
      const height = Math.floor(this.currentImage.height * scale);

      this.hiddenCanvas.width = width;
      this.hiddenCanvas.height = height;
      this.ctx.drawImage(this.currentImage, 0, 0, width, height);

      return this.animateProgress(30, 50, 150);
    }).then(() => {
      const imageData = this.ctx.getImageData(0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
      const colorCount = parseInt(this.colorCount.value);

      return this.animateProgress(50, 70, 200).then(() => {
        return { imageData, colorCount };
      });
    }).then(({ imageData, colorCount }) => {
      // Extract colors
      this.currentPalette = this.extractor.extractColors(imageData, colorCount, newVariation);

      return this.animateProgress(70, 100, 250);
    }).then(() => {
      this.finalizePaletteGeneration(newVariation);
    });
  }

  generateFromBaseColors(newVariation) {
    this.animateProgress(0, 30, 200).then(() => {
      const colorCount = parseInt(this.colorCount.value);
      const baseColorsRgb = this.baseColors.map(hex => this.hexToRgb(hex));

      return this.animateProgress(30, 70, 200).then(() => {
        return { baseColorsRgb, colorCount };
      });
    }).then(({ baseColorsRgb, colorCount }) => {
      // Generate palette using color theory
      this.currentPalette = this.generateColorTheoryPalette(baseColorsRgb, colorCount);

      return this.animateProgress(70, 100, 250);
    }).then(() => {
      this.finalizePaletteGeneration(newVariation, 'colors');
    });
  }

  generateHybridPalette(newVariation) {
    this.animateProgress(0, 30, 200).then(() => {
      // Draw image to canvas
      const maxSize = 200;
      const scale = Math.min(maxSize / this.currentImage.width, maxSize / this.currentImage.height, 1);
      const width = Math.floor(this.currentImage.width * scale);
      const height = Math.floor(this.currentImage.height * scale);

      this.hiddenCanvas.width = width;
      this.hiddenCanvas.height = height;
      this.ctx.drawImage(this.currentImage, 0, 0, width, height);

      return this.animateProgress(30, 50, 150);
    }).then(() => {
      const imageData = this.ctx.getImageData(0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
      const colorCount = parseInt(this.colorCount.value);
      const baseColorsRgb = this.baseColors.map(hex => this.hexToRgb(hex));

      return this.animateProgress(50, 70, 200).then(() => {
        return { imageData, colorCount, baseColorsRgb };
      });
    }).then(({ imageData, colorCount, baseColorsRgb }) => {
      // Extract image colors
      const imageColors = this.extractor.extractColors(imageData, colorCount, newVariation);

      // Lock base colors and fill rest from image
      const lockedColors = baseColorsRgb.map(rgb => ({
        rgb,
        hex: this.extractor.rgbToHex(rgb),
        percentage: (100 / colorCount).toFixed(1)
      }));

      // Fill remaining slots with image colors
      const remainingSlots = colorCount - this.baseColors.length;
      const imageColorsToAdd = imageColors.slice(0, remainingSlots);

      this.currentPalette = [...lockedColors, ...imageColorsToAdd];

      return this.animateProgress(70, 100, 250);
    }).then(() => {
      this.finalizePaletteGeneration(newVariation, 'hybrid');
    });
  }

  generateColorTheoryPalette(baseColorsRgb, targetCount) {
    const palette = [];

    // Add base colors
    baseColorsRgb.forEach(rgb => {
      palette.push({
        rgb,
        hex: this.extractor.rgbToHex(rgb),
        percentage: (100 / targetCount).toFixed(1)
      });
    });

    // Fill remaining slots using color harmonies
    const remainingSlots = targetCount - baseColorsRgb.length;

    if (remainingSlots > 0) {
      const primaryColor = baseColorsRgb[0];

      if (baseColorsRgb.length === 1) {
        // Generate multiple color harmonies to fill all slots
        const analogous = this.extractor.generateAnalogous(primaryColor);
        const complementary = this.extractor.generateComplementary(primaryColor);
        const triadic = this.extractor.generateTriadic(primaryColor);
        const splitComp = this.extractor.generateSplitComplementary(primaryColor);
        const tetradic = this.extractor.generateTetradic(primaryColor);

        // Collect all generated colors (excluding duplicates of base color)
        const newColors = [];
        newColors.push(...analogous.filter((_, i) => i !== 1)); // analogous without base (2 colors)
        newColors.push(complementary); // 1 color
        newColors.push(...triadic.filter((_, i) => i !== 0)); // triadic without base (2 colors)
        newColors.push(...splitComp.filter((_, i) => i !== 0)); // split-comp without base (2 colors)
        newColors.push(...tetradic.filter((_, i) => i !== 0)); // tetradic without base (3 colors)

        // Generate tints and shades if we still need more colors
        if (newColors.length < remainingSlots) {
          const tints = this.extractor.generateTints(primaryColor, 2);
          const shades = this.extractor.generateShades(primaryColor, 2);
          newColors.push(...tints, ...shades);
        }

        // Take only what we need
        newColors.slice(0, remainingSlots).forEach(rgb => {
          palette.push({
            rgb,
            hex: this.extractor.rgbToHex(rgb),
            percentage: (100 / targetCount).toFixed(1)
          });
        });
      } else if (baseColorsRgb.length === 2) {
        // Generate colors between and around the two base colors
        const midColor = this.blendColors(baseColorsRgb[0], baseColorsRgb[1]);
        const analogous1 = this.extractor.generateAnalogous(baseColorsRgb[0]);
        const analogous2 = this.extractor.generateAnalogous(baseColorsRgb[1]);
        const triadic1 = this.extractor.generateTriadic(baseColorsRgb[0]);
        const triadic2 = this.extractor.generateTriadic(baseColorsRgb[1]);

        const candidates = [midColor, ...analogous1, ...analogous2, ...triadic1, ...triadic2];
        candidates.slice(0, remainingSlots).forEach(rgb => {
          palette.push({
            rgb,
            hex: this.extractor.rgbToHex(rgb),
            percentage: (100 / targetCount).toFixed(1)
          });
        });
      } else {
        // 3 base colors - generate harmonies from all base colors
        const analogous1 = this.extractor.generateAnalogous(baseColorsRgb[0]);
        const analogous2 = this.extractor.generateAnalogous(baseColorsRgb[1]);
        const analogous3 = this.extractor.generateAnalogous(baseColorsRgb[2]);
        const triadic = this.extractor.generateTriadic(primaryColor);
        const tetradic = this.extractor.generateTetradic(primaryColor);

        const candidates = [...analogous1, ...analogous2, ...analogous3, ...triadic, ...tetradic];
        candidates.slice(0, remainingSlots).forEach(rgb => {
          palette.push({
            rgb,
            hex: this.extractor.rgbToHex(rgb),
            percentage: (100 / targetCount).toFixed(1)
          });
        });
      }
    }

    return palette.slice(0, targetCount);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [128, 128, 128];
  }

  blendColors(rgb1, rgb2, ratio = 0.5) {
    return [
      Math.round(rgb1[0] * ratio + rgb2[0] * (1 - ratio)),
      Math.round(rgb1[1] * ratio + rgb2[1] * (1 - ratio)),
      Math.round(rgb1[2] * ratio + rgb2[2] * (1 - ratio))
    ];
  }

  finalizePaletteGeneration(newVariation, mode = 'image') {
    this.renderPalette();
    this.showLoading(false);

    // Reset variations state
    this.variationsVisible = false;

    // Show action buttons after first generation
    this.regenerateBtn.style.display = 'flex';
    this.toggleVariationsBtn.style.display = 'flex';

    // Update button text to "Show Variants"
    this.toggleVariationsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      Show Variants
    `;

    // Show feedback for new variation
    if (newVariation) {
      this.showToast('New palette variation generated');
    } else if (mode === 'hybrid') {
      this.showToast('Hybrid palette generated with your colors');
    } else if (mode === 'colors') {
      this.showToast('Palette generated from base colors');
    }
  }

  animateProgress(from, to, duration) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = from + (to - from) * eased;

        this.progressBar.style.width = `${currentValue}%`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  renderPalette() {
    this.paletteGrid.innerHTML = '';
    this.emptyState.style.display = 'none';
    this.exportBtn.style.display = 'block';

    this.currentPalette.forEach((color, index) => {
      const tints = this.extractor.generateTints(color.rgb, 4);
      const shades = this.extractor.generateShades(color.rgb, 4);

      const card = document.createElement('div');
      card.className = 'color-card';
      card.innerHTML = `
                    <div class="color-main-row">
                        <div class="color-swatch" style="background-color: ${color.hex}" data-hex="${color.hex}"></div>
                        <div class="color-info">
                            <div class="color-hex">${color.hex}</div>
                            <div class="color-rgb">RGB(${color.rgb.join(', ')})</div>
                            <div class="color-percentage">${color.percentage}% of image</div>
                        </div>
                    </div>
                    <div class="variations-row">
                        <div class="variation-group">
                            <div class="variation-label">Tints</div>
                            <div class="variation-swatches">
                                ${tints.map(t => {
        const hex = this.extractor.rgbToHex(t);
        return `<div class="variation-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
      }).join('')}
                            </div>
                        </div>
                        <div class="variation-group">
                            <div class="variation-label">Shades</div>
                            <div class="variation-swatches">
                                ${shades.map(s => {
        const hex = this.extractor.rgbToHex(s);
        return `<div class="variation-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
      }).join('')}
                            </div>
                        </div>
                    </div>
                `;

      // Add click handlers for all swatches
      card.querySelector('.color-swatch').addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyColor(color.hex);
      });

      card.querySelectorAll('.variation-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          this.copyColor(swatch.dataset.hex);
        });
      });

      // Animate in
      card.style.opacity = '0';
      card.style.transform = 'translateY(10px)';
      this.paletteGrid.appendChild(card);

      setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50);
    });

    // Add color harmony section based on dominant color
    this.renderHarmonySection();
  }

  renderHarmonySection() {
    if (this.currentPalette.length === 0) return;

    // Use a random base color from the palette for variations
    const baseIndex = this.harmonyBaseIndex !== undefined ? this.harmonyBaseIndex : 0;
    const baseColor = this.currentPalette[baseIndex];

    // Generate harmony variations with slight angle offsets for variety
    const angleOffset = this.harmonyAngleOffset || 0;

    const complementary = this.extractor.generateComplementary(baseColor.rgb);
    const analogous = this.extractor.generateAnalogousWithOffset(baseColor.rgb, angleOffset);
    const triadic = this.extractor.generateTriadicWithOffset(baseColor.rgb, angleOffset);
    const splitComp = this.extractor.generateSplitComplementaryWithOffset(baseColor.rgb, angleOffset);
    const tetradic = this.extractor.generateTetradic(baseColor.rgb, angleOffset);

    const harmonySection = document.createElement('div');
    harmonySection.className = 'harmony-section';
    harmonySection.innerHTML = `
                <div class="harmony-header">
                    <div class="harmony-title">Color Harmonies</div>
                    <div class="harmony-controls">
                        <label>Base color:</label>
                        <div class="custom-harmony-select" id="customHarmonySelect">
                            <div class="custom-harmony-select-trigger">
                                <span class="custom-harmony-select-value">${baseColor.hex}</span>
                                <svg class="custom-harmony-select-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M2 4l4 4 4-4"/>
                                </svg>
                            </div>
                            <div class="custom-harmony-select-dropdown">
                                ${this.currentPalette.map((c, i) =>
      `<div class="custom-harmony-select-option ${i === baseIndex ? 'selected' : ''}" data-value="${i}">${c.hex}</div>`
    ).join('')}
                            </div>
                        </div>
                        <select id="baseColorSelect" class="base-color-select" style="display: none;">
                            ${this.currentPalette.map((c, i) =>
      `<option value="${i}" ${i === baseIndex ? 'selected' : ''}>${c.hex}</option>`
    ).join('')}
                        </select>
                        <button class="shuffle-harmony-btn" id="shuffleHarmonyBtn" title="Shuffle harmony angles">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="harmony-row">
                    <div class="harmony-group">
                        <div class="harmony-group-label">Complementary</div>
                        <div class="harmony-swatches">
                            <div class="harmony-swatch" style="background-color: ${baseColor.hex}" data-hex="${baseColor.hex}"></div>
                            <div class="harmony-swatch" style="background-color: ${this.extractor.rgbToHex(complementary)}" data-hex="${this.extractor.rgbToHex(complementary)}"></div>
                        </div>
                    </div>
                    <div class="harmony-group">
                        <div class="harmony-group-label">Analogous</div>
                        <div class="harmony-swatches">
                            ${analogous.map(c => {
      const hex = this.extractor.rgbToHex(c);
      return `<div class="harmony-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
    }).join('')}
                        </div>
                    </div>
                    <div class="harmony-group">
                        <div class="harmony-group-label">Triadic</div>
                        <div class="harmony-swatches">
                            ${triadic.map(c => {
      const hex = this.extractor.rgbToHex(c);
      return `<div class="harmony-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
    }).join('')}
                        </div>
                    </div>
                    <div class="harmony-group">
                        <div class="harmony-group-label">Split-Complementary</div>
                        <div class="harmony-swatches">
                            ${splitComp.map(c => {
      const hex = this.extractor.rgbToHex(c);
      return `<div class="harmony-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
    }).join('')}
                        </div>
                    </div>
                    <div class="harmony-group">
                        <div class="harmony-group-label">Tetradic (Square)</div>
                        <div class="harmony-swatches">
                            ${tetradic.map(c => {
      const hex = this.extractor.rgbToHex(c);
      return `<div class="harmony-swatch" style="background-color: ${hex}" data-hex="${hex}"></div>`;
    }).join('')}
                        </div>
                    </div>
                </div>
            `;

    // Add click handlers for harmony swatches
    harmonySection.querySelectorAll('.harmony-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.copyColor(swatch.dataset.hex);
      });
    });

    // Add custom harmony select handlers
    const customHarmonySelect = harmonySection.querySelector('#customHarmonySelect');
    const customHarmonySelectTrigger = customHarmonySelect.querySelector('.custom-harmony-select-trigger');
    const customHarmonySelectOptions = customHarmonySelect.querySelectorAll('.custom-harmony-select-option');
    const baseColorSelect = harmonySection.querySelector('#baseColorSelect');

    customHarmonySelectTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      customHarmonySelect.classList.toggle('open');
    });

    customHarmonySelectOptions.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.textContent;

        // Update visual state
        customHarmonySelectOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        customHarmonySelect.querySelector('.custom-harmony-select-value').textContent = text;

        // Update hidden select
        baseColorSelect.value = value;

        // Close dropdown
        customHarmonySelect.classList.remove('open');

        // Update harmony base index
        this.harmonyBaseIndex = parseInt(value);
        this.refreshHarmonySection();
      });
    });

    // Close custom harmony select when clicking outside
    document.addEventListener('click', (e) => {
      if (!customHarmonySelect.contains(e.target)) {
        customHarmonySelect.classList.remove('open');
      }
    });

    // Add shuffle button handler
    const shuffleBtn = harmonySection.querySelector('#shuffleHarmonyBtn');
    shuffleBtn.addEventListener('click', () => {
      this.harmonyAngleOffset = Math.floor(Math.random() * 30) - 15; // -15 to +15 degrees
      this.refreshHarmonySection();
      this.showToast('Harmony angles shuffled');
    });

    this.paletteGrid.appendChild(harmonySection);
  }

  refreshHarmonySection() {
    const existingHarmony = this.paletteGrid.querySelector('.harmony-section');
    if (existingHarmony) {
      existingHarmony.remove();
    }
    this.renderHarmonySection();
  }

  toggleAllVariations() {
    this.variationsVisible = !this.variationsVisible;
    const allCards = this.paletteGrid.querySelectorAll('.color-card');

    allCards.forEach(card => {
      if (this.variationsVisible) {
        card.classList.add('expanded');
      } else {
        card.classList.remove('expanded');
      }
    });

    // Update button text
    this.toggleVariationsBtn.textContent = this.variationsVisible ? 'Hide Variants' : 'Show Variants';

    // Update button icon to match text
    const buttonText = this.variationsVisible ? 'Hide Variants' : 'Show Variants';
    this.toggleVariationsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      ${buttonText}
    `;
  }

  showLoading(show, isVariation = false) {
    this.loading.classList.toggle('active', show);
    this.paletteGrid.style.display = show ? 'none' : 'grid';

    if (show) {
      // Reset progress bar
      this.progressBar.style.width = '0%';
      this.loadingText.textContent = isVariation ? 'Generating variation...' : 'Analyzing colors...';
    }
  }

  copyColor(hex) {
    navigator.clipboard.writeText(hex.replace('#', '')).then(() => {
      this.showToast('Color copied to clipboard');
    });
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    setTimeout(() => this.toast.classList.remove('show'), 2000);
  }

  openExportModal() {
    this.modalOverlay.classList.add('active');
    this.exportPreview.style.display = 'none';
    this.copyExportBtn.style.display = 'none';
    this.exportOptions.forEach(opt => opt.style.background = '');
  }

  closeExportModal() {
    this.modalOverlay.classList.remove('active');
  }

  selectExportFormat(format) {
    let output = '';

    this.exportOptions.forEach(opt => {
      opt.style.background = opt.dataset.format === format ? '#f0f0f0' : '';
    });

    // Build extended palette with variations
    const extendedPalette = this.currentPalette.map((color, i) => {
      const tints = this.extractor.generateTints(color.rgb, 4);
      const shades = this.extractor.generateShades(color.rgb, 4);
      return {
        main: color,
        tints: tints.map(t => ({ rgb: t, hex: this.extractor.rgbToHex(t) })),
        shades: shades.map(s => ({ rgb: s, hex: this.extractor.rgbToHex(s) }))
      };
    });

    switch (format) {
      case 'css':
        output = ':root {\n  /* Main Colors */\n' +
          this.currentPalette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n') +
          '\n\n  /* Tints & Shades */\n' +
          extendedPalette.map((c, i) => {
            const tintVars = c.tints.map((t, j) => `  --color-${i + 1}-tint-${j + 1}: ${t.hex};`).join('\n');
            const shadeVars = c.shades.map((s, j) => `  --color-${i + 1}-shade-${j + 1}: ${s.hex};`).join('\n');
            return tintVars + '\n' + shadeVars;
          }).join('\n') +
          '\n}';
        break;
      case 'scss':
        output = '// Main Colors\n' +
          this.currentPalette.map((c, i) => `$color-${i + 1}: ${c.hex};`).join('\n') +
          '\n\n// Tints & Shades\n' +
          extendedPalette.map((c, i) => {
            const tintVars = c.tints.map((t, j) => `$color-${i + 1}-tint-${j + 1}: ${t.hex};`).join('\n');
            const shadeVars = c.shades.map((s, j) => `$color-${i + 1}-shade-${j + 1}: ${s.hex};`).join('\n');
            return tintVars + '\n' + shadeVars;
          }).join('\n');
        break;
      case 'json':
        output = JSON.stringify(extendedPalette.map((c, i) => ({
          name: `color-${i + 1}`,
          main: { hex: c.main.hex, rgb: c.main.rgb },
          tints: c.tints.map(t => ({ hex: t.hex, rgb: t.rgb })),
          shades: c.shades.map(s => ({ hex: s.hex, rgb: s.rgb }))
        })), null, 2);
        break;
      case 'hex':
        output = extendedPalette.map((c, i) => {
          return `Color ${i + 1}: ${c.main.hex}\n` +
            `  Tints: ${c.tints.map(t => t.hex).join(', ')}\n` +
            `  Shades: ${c.shades.map(s => s.hex).join(', ')}`;
        }).join('\n\n');
        break;
    }

    this.currentExport = output;
    this.exportPreview.textContent = output;
    this.exportPreview.style.display = 'block';
    this.copyExportBtn.style.display = 'block';
  }

  copyExport() {
    navigator.clipboard.writeText(this.currentExport).then(() => {
      this.showToast('Exported palette copied');
      this.closeExportModal();
    });
  }

  toggleCustomSelect() {
    this.customSelect.classList.toggle('open');
  }

  selectCustomOption(option) {
    const value = option.dataset.value;
    const text = option.textContent;

    // Update visual state
    this.customSelectOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    this.customSelectValue.textContent = text;

    // Update hidden select
    this.colorCount.value = value;

    // Close dropdown
    this.customSelect.classList.remove('open');
  }

  // Base Colors Management
  initializeBaseColors() {
    this.updateAddColorButton();
  }

  addBaseColor() {
    if (this.baseColors.length >= 3) return;

    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    this.baseColors.push(randomColor);
    this.renderBaseColors();
    this.updateAddColorButton();
    this.showControls(); // Show controls when base colors are added
  }

  removeBaseColor(index) {
    this.baseColors.splice(index, 1);
    this.renderBaseColors();
    this.updateAddColorButton();
  }

  updateBaseColor(index, color, skipRender = false) {
    // Validate hex color
    const hexRegex = /^#?([A-Fa-f0-9]{6})$/;
    const match = color.match(hexRegex);

    if (match) {
      this.baseColors[index] = '#' + match[1].toUpperCase();

      // Only re-render if not actively using color picker
      if (!skipRender) {
        this.renderBaseColors();
      }
    }
  }

  renderBaseColors() {
    this.baseColorsList.innerHTML = '';

    this.baseColors.forEach((color, index) => {
      const colorItem = document.createElement('div');
      colorItem.className = 'base-color-item';
      colorItem.innerHTML = `
        <div class="color-picker-wrapper">
          <div class="color-picker-btn" style="background-color: ${color}">
            <input type="color" class="color-picker-input" value="${color}" data-index="${index}">
          </div>
        </div>
        <input type="text" class="color-hex-input" value="${color}" data-index="${index}" maxlength="7">
        <button class="remove-color-btn" data-index="${index}" title="Remove color">×</button>
      `;

      // Add event listeners
      const colorPicker = colorItem.querySelector('.color-picker-input');
      const colorPickerBtn = colorItem.querySelector('.color-picker-btn');
      const hexInput = colorItem.querySelector('.color-hex-input');
      const removeBtn = colorItem.querySelector('.remove-color-btn');

      // Update color in real-time while picking (without re-rendering)
      colorPicker.addEventListener('input', (e) => {
        this.baseColors[index] = e.target.value.toUpperCase();
        colorPickerBtn.style.backgroundColor = e.target.value;
        hexInput.value = e.target.value.toUpperCase();
      });

      // Re-render only when color picker is closed
      colorPicker.addEventListener('change', (e) => {
        this.updateBaseColor(index, e.target.value);
      });

      hexInput.addEventListener('blur', (e) => {
        this.updateBaseColor(index, e.target.value);
      });

      hexInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.updateBaseColor(index, e.target.value);
        }
      });

      removeBtn.addEventListener('click', () => {
        this.removeBaseColor(index);
      });

      this.baseColorsList.appendChild(colorItem);
    });
  }

  updateAddColorButton() {
    if (this.baseColors.length >= 3) {
      this.addColorBtn.disabled = true;
      this.addColorBtn.textContent = 'Maximum 3 colors';
    } else {
      this.addColorBtn.disabled = false;
      this.addColorBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Add Color (${this.baseColors.length}/3)
      `;
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new PaletteGenerator();
});
