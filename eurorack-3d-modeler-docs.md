# EuroRack 3D Modeler - Complete Documentation

## Overview

The EuroRack 3D Modeler is a professional-grade web application designed for creating accurate 3D models of Eurorack modular synthesizer modules. This tool empowers engineers, makers, and DIY builders to plan their builds, create precise 3D representations, and organize their modular systems effectively.

## Features

### Core Functionality

1. **Module Designer**
   - Comprehensive measurement input system
   - HP-based width selection (1-84 HP)
   - Standard Eurorack dimensions (3U height: 128.5mm)
   - Depth measurements for skiff compatibility
   - Real-time validation against Eurorack standards

2. **Control Layout Tool**
   - Interactive panel layout editor
   - Support for knobs, switches, jacks, LEDs, and displays
   - Precise positioning with grid snapping
   - Visual feedback and measurement overlays

3. **Image Upload System**
   - Multi-image drag-and-drop upload
   - Support for JPG, PNG, WEBP formats
   - Image validation and optimization
   - Front panel, side view, and component layout images

4. **AI 3D Model Generation** (Mock Implementation)
   - Text-to-3D and Image-to-3D workflows
   - Progress tracking and status updates
   - Quality settings and generation options
   - Integration framework for real AI services

5. **Interactive 3D Viewer**
   - Three.js-based 3D rendering
   - Orbit controls (rotate, zoom, pan)
   - Multiple view modes and camera positions
   - Measurement overlays and annotations
   - Professional lighting and materials

6. **Rack Assembly Tool**
   - Virtual Eurorack cases (84HP, 104HP, 168HP)
   - Drag-and-drop module placement
   - Snap-to-grid functionality
   - Power consumption calculator
   - Multi-row support for 6U cases

7. **Export System**
   - Multiple 3D formats (STL, OBJ, GLB)
   - Project file export/import (JSON)
   - Rack configuration export
   - Technical drawings and parts lists

## Getting Started

### Basic Workflow

1. **Open the Application**
   - Navigate to the application URL
   - The interface opens with a clean, professional layout

2. **Design Your Module**
   - Enter basic specifications (HP width, depth, etc.)
   - Upload reference images of your module
   - Position controls on the panel layout

3. **Generate 3D Model**
   - Click "Generate 3D Model" to start the process
   - Monitor progress through the status indicators
   - Review the generated model in the 3D viewer

4. **Assemble Your Rack**
   - Drag the completed module into the rack area
   - Add additional modules to build your system
   - Monitor power consumption and spacing

5. **Export Your Work**
   - Export individual modules as STL files
   - Save complete rack configurations
   - Generate technical documentation

### Interface Guide

#### Left Panel - Module Designer

**Specifications Tab:**
- Module Name: Give your module a descriptive name
- HP Width: Select from 1-84 HP (visual ruler shows actual size)
- Height: Standard 3U (128.5mm) or custom height
- Depth: Important for skiff cases (25-40mm typical)
- Power Requirements: Set current draw for each rail

**Layout Tab:**
- Interactive panel editor
- Add controls by clicking the type buttons
- Position controls with drag-and-drop
- Grid snapping for precise alignment
- Control properties panel for fine-tuning

**Images Tab:**
- Drag-and-drop image upload area
- Support for multiple image types
- Image preview and management
- Crop and rotation tools

#### Center Panel - 3D Viewer

- **View Controls:**
  - Left mouse: Rotate camera
  - Right mouse: Pan camera
  - Wheel: Zoom in/out
  - Space: Reset camera position

- **Display Options:**
  - Wireframe/Solid toggle
  - Measurement overlay
  - Grid and axis helpers
  - Lighting controls

#### Right Panel - Rack Assembly

- **Rack Configuration:**
  - Case size selection (84HP, 104HP, 168HP)
  - Row configuration (3U or 6U)
  - Power supply specifications

- **Module Management:**
  - Drag modules from library
  - Position with snap-to-grid
  - Power consumption tracking
  - Module spacing validation

## Technical Specifications

### Eurorack Standards

- **HP Units:** 1 HP = 5.08mm (0.2 inches)
- **Standard Height:** 3U = 128.5mm
- **Power Rails:** +12V, -12V, +5V
- **Mounting:** M3 screws on 5.08mm grid
- **Panel Thickness:** 2mm standard

### File Formats

**Input:**
- Images: JPG, PNG, WEBP
- Projects: JSON

**Export:**
- 3D Models: STL, OBJ, GLB, GLTF
- Projects: JSON
- Drawings: PDF, SVG

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL 2.0 support required for 3D functionality.

## Advanced Features

### Keyboard Shortcuts

- **Tab:** Switch between input fields
- **Ctrl+S:** Save project
- **Ctrl+O:** Open project
- **Ctrl+E:** Export current module
- **Space:** Reset 3D camera
- **G:** Toggle grid in 3D viewer
- **M:** Toggle measurement overlay

### Power Calculation

The application automatically calculates total power consumption:
- Tracks current draw on all three rails
- Warns when approaching PSU limits
- Suggests power supply upgrades
- Highlights problematic modules

### Project Management

Projects are saved as JSON files containing:
- Module specifications
- Control layouts
- Images (base64 encoded)
- Rack configurations
- Export settings

### API Integration Framework

The application includes a framework for integrating with AI 3D generation services:

```javascript
// Example API integration
const aiService = new AIModelGenerator({
    service: 'meshy',
    apiKey: 'your-api-key'
});

const model = await aiService.generateFromImage({
    image: uploadedImage,
    dimensions: moduleSpec,
    quality: 'high'
});
```

## Troubleshooting

### Common Issues

1. **3D Viewer Not Loading**
   - Check WebGL support in browser
   - Update graphics drivers
   - Try different browser

2. **Image Upload Fails**
   - Check file size (max 10MB)
   - Verify file format (JPG, PNG, WEBP)
   - Clear browser cache

3. **Measurements Not Accurate**
   - Verify HP calculations (1 HP = 5.08mm)
   - Check input validation messages
   - Use metric measurements

### Performance Tips

- Use smaller images for better performance
- Close unused browser tabs
- Enable hardware acceleration
- Use Chrome for best performance

## Development Guide

### Architecture

The application uses a modular architecture with ES6 classes:

- `EuroRackApp`: Main application controller
- `ThreeJSViewer`: 3D rendering and interaction
- `ModuleDesigner`: Specification and layout tools
- `RackAssembler`: Virtual rack management
- `ExportManager`: File export functionality

### Extending the Application

**Adding New Control Types:**
```javascript
const newControlType = {
    name: 'slider',
    icon: '📶',
    defaultSize: { width: 15, height: 45 },
    properties: ['min', 'max', 'default']
};

app.addControlType(newControlType);
```

**Custom Export Formats:**
```javascript
const customExporter = {
    format: 'step',
    extension: 'stp',
    export: (model) => {
        // Custom export logic
        return convertToSTEP(model);
    }
};

app.registerExporter(customExporter);
```

## Future Enhancements

### Planned Features

1. **Real AI Integration**
   - Connect to Meshy AI, TripoSR APIs
   - Advanced material generation
   - Texture synthesis

2. **Advanced Modeling**
   - Custom PCB layout integration
   - Component library
   - Mechanical constraints

3. **Collaboration**
   - Cloud project sharing
   - Team collaboration tools
   - Version control

4. **Manufacturing**
   - CNC toolpath generation
   - 3D printing optimization
   - Parts sourcing integration

### Community Contributions

The application is designed to be extensible. Community contributions are welcome for:
- Additional control types
- Export format support
- UI/UX improvements
- Performance optimizations

## Support

For technical support and feature requests:
- Review the troubleshooting guide
- Check browser compatibility
- Ensure WebGL 2.0 support
- Verify file format requirements

## License

This application is designed for educational and personal use. Professional use may require additional licensing for AI services and export capabilities.

---

**Version:** 1.0
**Last Updated:** August 2025
**Compatibility:** Modern browsers with WebGL 2.0 support