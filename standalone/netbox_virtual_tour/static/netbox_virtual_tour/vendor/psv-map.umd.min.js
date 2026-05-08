(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three'), require('@photo-sphere-viewer/core')) :
    typeof define === 'function' && define.amd ? define(['exports', 'three', '@photo-sphere-viewer/core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.PhotoSphereViewer = global.PhotoSphereViewer || {}, global.PhotoSphereViewer.MapPlugin = {}), global.THREE, global.PhotoSphereViewer));
})(this, (function (exports, THREE, PhotoSphereViewer) {

console.warn('PhotoSphereViewer "index.js" scripts are deprecated and will be removed in a future version. Please use ES Modules: https://photo-sphere-viewer.js.org/guide/#your-first-viewer');

/*!
 * PhotoSphereViewer.MapPlugin 5.7.4
 * @copyright 2024 Damien "Mistic" Sorel
 * @licence MIT (https://opensource.org/licenses/MIT)
 */
"use strict";
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };

  // @photo-sphere-viewer/core
  var require_core = () => PhotoSphereViewer;

  // three
  var require_three = () => THREE;

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    MapPlugin: () => MapPlugin,
    events: () => events_exports
  });
  var import_core8 = require_core();

  // src/events.ts
  var events_exports = {};
  __export(events_exports, {
    SelectHotspot: () => SelectHotspot
  });
  var import_core = require_core();
  var _SelectHotspot = class _SelectHotspot extends import_core.TypedEvent {
    /** @internal */
    constructor(hotspotId) {
      super(_SelectHotspot.type);
      this.hotspotId = hotspotId;
    }
  };
  _SelectHotspot.type = "select-hotspot";
  var SelectHotspot = _SelectHotspot;

  // src/MapPlugin.ts
  var import_core7 = require_core();
  var import_three2 = require_three();

  // src/components/MapComponent.ts
  var import_core6 = require_core();
  var import_three = require_three();

  // src/constants.ts
  var MARKER_DATA_KEY = "map";
  var HOTSPOT_GENERATED_ID = "__generated__";
  var HOTSPOT_MARKER_ID = "__marker__";
  var PIN_SHADOW_OFFSET = 2;
  var PIN_SHADOW_BLUR = 4;
  var MAP_SHADOW_BLUR = 10;

  // src/utils.ts
  var import_core2 = require_core();
  function loadImage(src) {
    const image = document.createElement("img");
    if (!src.includes("<svg")) {
      image.src = src;
    } else {
      if (!/<svg[^>]*width="/.test(src) && src.includes("viewBox")) {
        const [, , , width, height] = /viewBox="([0-9-]+) ([0-9-]+) ([0-9]+) ([0-9]+)"/.exec(src);
        src = src.replace("<svg", `<svg width="${width}px" height="${height}px"`);
      }
      const src64 = `data:image/svg+xml;base64,${window.btoa(src)}`;
      image.src = src64;
    }
    return image;
  }
  function getImageHtml(src) {
    if (!src) {
      return "";
    } else if (!src.includes("<svg")) {
      return `<img src="${src}">`;
    } else {
      return src;
    }
  }
  function getStyle(defaultStyle, style, isHover) {
    return {
      image: isHover ? style.hoverImage ?? style.image ?? defaultStyle.hoverImage ?? defaultStyle.image : style.image ?? defaultStyle.image,
      size: isHover ? style.hoverSize ?? style.size ?? defaultStyle.hoverSize ?? defaultStyle.size : style.size ?? defaultStyle.size,
      color: isHover ? style.hoverColor ?? style.color ?? defaultStyle.hoverColor ?? defaultStyle.color : style.color ?? defaultStyle.color,
      borderColor: isHover ? style.hoverBorderColor ?? defaultStyle.hoverBorderColor : null,
      borderSize: isHover ? style.hoverBorderSize ?? defaultStyle.hoverBorderSize : null
    };
  }
  function unprojectPoint(pt, yaw, zoom) {
    return {
      x: (Math.cos(yaw) * pt.x - Math.sin(yaw) * pt.y) / zoom,
      y: (Math.sin(yaw) * pt.x + Math.cos(yaw) * pt.y) / zoom
    };
  }
  function projectPoint(pt, yaw, zoom) {
    return {
      x: (Math.cos(-yaw) * pt.x - Math.sin(-yaw) * pt.y) * zoom,
      y: (Math.sin(-yaw) * pt.x + Math.cos(-yaw) * pt.y) * zoom
    };
  }
  function canvasShadow(context, offsetX, offsetY, blur, color = "black") {
    context.shadowOffsetX = offsetX * import_core2.SYSTEM.pixelRatio;
    context.shadowOffsetY = offsetY * import_core2.SYSTEM.pixelRatio;
    context.shadowBlur = blur * import_core2.SYSTEM.pixelRatio;
    context.shadowColor = color;
  }
  function drawImageCentered(context, image, size) {
    const w = image.width;
    const h = image.height;
    drawImageHighDpi(
      context,
      image,
      -size / 2,
      -(h / w * size) / 2,
      size,
      h / w * size
    );
  }
  function drawImageHighDpi(context, image, x, y, w, h) {
    context.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      x * import_core2.SYSTEM.pixelRatio,
      y * import_core2.SYSTEM.pixelRatio,
      w * import_core2.SYSTEM.pixelRatio,
      h * import_core2.SYSTEM.pixelRatio
    );
  }
  function rgbToRgba(rgb, alpha) {
    return `rgba(${rgb.slice(4, -1)},${alpha})`;
  }

  // src/components/MapCloseButton.ts
  var import_core4 = require_core();

  // src/icons/map.svg
  var map_default = '<svg viewBox="114 45 472 472" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M383.6 196a67.3 67.3 0 1 0-134.5.1 67.3 67.3 0 0 0 134.5-.1zm-100.8 0a33.6 33.6 0 1 1 67.3 0 33.6 33.6 0 0 1-67.3 0z"/><path d="M584 340.8a16.8 16.8 0 0 0-15.6-10.4H403.8c25.2-40.2 47-88 47-133.4A135 135 0 0 0 316.4 61.6 135 135 0 0 0 182 197c0 55.8 33 115.3 64.7 159.8L120.4 469a16.8 16.8 0 0 0 11.2 29.4H434c4.5 0 8.7-1.8 11.9-5l134.4-134.3c4.8-4.8 6.2-12 3.6-18.3zM215.5 197c0-56.1 45.2-101.8 100.8-101.8 55.6 0 100.8 45.6 100.8 101.8 0 65-57.1 144.2-100.8 192.8C273 341.7 215.6 262.3 215.6 197zM427 464.8H175.8l91.3-81.1a575.6 575.6 0 0 0 37.4 42.6 16.8 16.8 0 0 0 23.8 0c2.2-2.2 26.3-26.7 52.6-62.3h147z"/></g><!-- Created by Ayub Irawan from Noun Project --></svg>';

  // src/components/AbstractMapButton.ts
  var import_core3 = require_core();
  var INVERT_POSITIONS = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left"
  };
  function getButtonPosition(mapPosition, direction) {
    switch (direction) {
      case 1 /* DIAGONAL */:
        return [INVERT_POSITIONS[mapPosition[0]], INVERT_POSITIONS[mapPosition[1]]];
      case 2 /* HORIZONTAL */:
        return [mapPosition[0], INVERT_POSITIONS[mapPosition[1]]];
      case 3 /* VERTICAL */:
        return [INVERT_POSITIONS[mapPosition[0]], mapPosition[1]];
      default:
        return mapPosition;
    }
  }
  var AbstractMapButton = class extends import_core3.AbstractComponent {
    constructor(map, position) {
      super(map, {});
      this.map = map;
      this.position = position;
    }
    applyConfig() {
      this.container.className = `psv-map__button psv-map__button--${getButtonPosition(this.map.config.position, this.position).join("-")}`;
      this.update();
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    update() {
    }
  };

  // src/components/MapCloseButton.ts
  var MapCloseButton = class extends AbstractMapButton {
    constructor(map) {
      super(map, 0 /* DEFAULT */);
      this.container.addEventListener("click", (e) => {
        map.toggleCollapse();
        e.stopPropagation();
      });
    }
    applyConfig() {
      super.applyConfig();
      this.container.classList.add("psv-map__button-close");
    }
    update() {
      this.container.innerHTML = this.map.collapsed ? map_default : import_core4.CONSTANTS.ICONS.close;
      this.container.title = this.map.collapsed ? this.viewer.config.lang["map"] : this.viewer.config.lang.close;
    }
  };

  // src/icons/compass.svg
  var compass_default = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,0L70,50L50,100L30,50Z M50,86L64,50L36,50Z" fill="currentColor"/></svg>';

  // src/components/MapCompassButton.ts
  var MapCompassButton = class extends AbstractMapButton {
    constructor(map) {
      super(map, 3 /* VERTICAL */);
      this.container.title = this.viewer.config.lang["mapNorth"];
      this.container.innerHTML = compass_default;
      this.container.querySelector("svg").style.width = "80%";
      this.container.addEventListener("click", (e) => {
        this.viewer.dynamics.position.goto({ yaw: -map.config.rotation }, 2);
        e.stopPropagation();
      });
    }
    rotate(angle) {
      this.container.querySelector("svg").style.transform = `rotate3d(0, 0, 1, ${-angle}rad)`;
    }
  };

  // src/icons/maximize.svg
  var maximize_default = '<svg viewBox="95 25 510 510" xmlns="http://www.w3.org/2000/svg"><path d="M604.2 39.8v481c0 7.8-6.1 14-14 14H358.4c-7.8 0-14-6.2-14-14s6.2-14 14-14h217.8v-453H123.8v216.7c0 7.8-6.2 14-14 14-7.9 0-14-6.2-14-14V39.8c0-7.9 6.1-14 14-14h481c7.3 0 13.4 6.1 13.4 14zm-304 304v176.4c0 7.9-6.2 14-14 14H109.8c-7.9 0-14-6.1-14-14V343.8c0-7.8 6.1-14 14-14h176.4c7.2 0 14 6.8 14 14zm-28 14H123.8v148.4h148.4zm215.6-195.4v79.5c0 7.9 6.1 14 14 14 7.8 0 14-6.1 14-14V128.2c0-7.8-6.2-14-14-14H388.6c-7.8 0-14 6.2-14 14 0 7.9 6.2 14 14 14h79L326.5 283.4a13.5 13.5 0 0 0 0 19.6c2.8 2.8 6.1 3.9 10 3.9 4 0 7.3-1.1 10.1-4z" fill="currentColor"/><!-- Created by Gregor Cresnar from Noun Project --></svg>';

  // src/icons/minimize.svg
  var minimize_default = '<svg viewBox="95 25 510 510" xmlns="http://www.w3.org/2000/svg"><path d="M109.8 25.8h481c7.8 0 14 6.1 14 14v481c0 7.8-6.2 14-14 14H358.4c-7.8 0-14-6.2-14-14s6.2-14 14-14h217.8v-453H123.8v216.7c0 7.8-6.2 14-14 14-7.9 0-14-6.2-14-14V39.8c0-7.9 6.1-14 14-14zm176.4 508.4H109.8c-7.9 0-14-6.1-14-14V343.8c0-7.8 6.1-14 14-14h176.4c7.8 0 14 6.2 14 14v176.4c0 7.9-6.8 14-14 14zm-14-176.4H123.8v148.4h148.4zm64.4-191.5c-7.9 0-14 6.2-14 14v113.1c0 7.9 6.1 14 14 14h113c8 0 14-6.1 14-14s-6-14-14-14h-79.4l141-141a13.5 13.5 0 0 0 0-19.7 13.5 13.5 0 0 0-19.5 0L350.6 259.8v-79.5c0-7.8-6.2-14-14-14z" fill="currentColor"/><!-- Created by Gregor Cresnar from Noun Project --></svg>';

  // src/components/MapMaximizeButton.ts
  var ROTATION = {
    "bottom-left": 0,
    "bottom-right": -90,
    "top-right": 180,
    "top-left": 90
  };
  var MapMaximizeButton = class extends AbstractMapButton {
    constructor(map) {
      super(map, 1 /* DIAGONAL */);
      this.container.addEventListener("click", (e) => {
        map.toggleMaximized();
        e.stopPropagation();
      });
    }
    update() {
      this.container.innerHTML = this.map.maximized ? minimize_default : maximize_default;
      this.container.querySelector("svg").style.transform = `rotate3d(0, 0, 1, ${ROTATION[this.map.config.position.join("-")]}deg)`;
      this.container.title = this.map.maximized ? this.viewer.config.lang["mapMinimize"] : this.viewer.config.lang["mapMaximize"];
    }
  };

  // src/icons/reset.svg
  var reset_default = '<svg viewBox="170 100 360 360" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M518.6 269h-18.5a150.8 150.8 0 0 0-138-137.9v-20.9c0-5.8-4.7-10.6-10.5-10.6h-3.2c-5.8 0-10.6 4.8-10.6 10.6v21A150.8 150.8 0 0 0 200 269h-18.5c-5.9 0-10.6 4.7-10.6 10.6v3.2c0 5.8 4.7 10.5 10.6 10.5h18.5c6 73.4 64.6 132 138 138v18.5c0 5.8 4.7 10.6 10.5 10.6h3.2c5.8 0 10.6-4.8 10.6-10.6v-18.6c73.3-5.9 132-64.5 137.9-137.9h18.5c5.9 0 10.6-4.7 10.6-10.5v-3.2c0-5.9-4.7-10.6-10.6-10.6zM362.2 414.4v-9.8c0-5.9-4.8-10.6-10.6-10.6h-3.2c-5.8 0-10.6 4.7-10.6 10.6v9.8a134 134 0 0 1-121-121h9.8c5.9 0 10.6-4.8 10.6-10.6v-3.2c0-5.9-4.7-10.6-10.6-10.6h-9.8a134 134 0 0 1 121-121v7.5c0 5.8 4.8 10.5 10.6 10.5h3.2c5.8 0 10.6-4.7 10.6-10.5V148a134 134 0 0 1 121 121h-9.8c-5.9 0-10.6 4.7-10.6 10.6v3.2c0 5.8 4.7 10.5 10.6 10.5h9.8a134 134 0 0 1-121 121z"/><path d="M355.4 222a6 6 0 0 0-10.7 0L291 320a8.3 8.3 0 0 0 9.7 12l39.2-11.7c6.6-2 13.6-2 20.2 0l39.2 11.7a8.3 8.3 0 0 0 9.7-12z"/></g><!-- Created by muhammad benani from Noun Project --></svg>';

  // src/components/MapResetButton.ts
  var MapResetButton = class extends AbstractMapButton {
    constructor(map) {
      super(map, 2 /* HORIZONTAL */);
      this.container.title = this.viewer.config.lang["mapReset"];
      this.container.innerHTML = reset_default;
      this.container.querySelector("svg").style.width = "80%";
      this.container.addEventListener("click", (e) => {
        map.reset();
        e.stopPropagation();
      });
    }
  };

  // src/components/MapZoomToolbar.ts
  var import_core5 = require_core();

  // src/icons/minus.svg
  var minus_default = '<svg viewBox="128 58 444 444" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M350 58.2a221.8 221.8 0 1 0 0 443.6 221.8 221.8 0 0 0 0-443.6zm130.3 252.7H219.7a31 31 0 1 1 0-61.8h260.6a31 31 0 1 1 0 61.8z"/><!-- Created by Iconika from Noun Project --></svg>';

  // src/icons/plus.svg
  var plus_default = '<svg viewBox="143.8 73.8 412.5 412.5" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M350 73.8a206.2 206.2 0 1 0 0 412.4 206.2 206.2 0 0 0 0-412.4zm117.3 234H378v89.5a27.9 27.9 0 1 1-55.8 0V308h-89.4a27.9 27.9 0 1 1 0-55.8H322v-89.5a27.9 27.9 0 1 1 55.8 0v89.5h89.5a27.9 27.9 0 1 1 0 55.8z"/><!-- Created by Iconika from Noun Project --></svg>';

  // src/components/MapZoomToolbar.ts
  var MapZoomToolbar = class extends import_core5.AbstractComponent {
    constructor(map) {
      super(map, {
        className: "psv-map__toolbar"
      });
      this.map = map;
      this.handler = new import_core5.utils.PressHandler(100);
      this.container.innerHTML = `${minus_default}<span class="psv-map__toolbar-text">100%</span>${plus_default}`;
      this.zoomIndicator = this.container.querySelector(".psv-map__toolbar-text");
      const zoomButtons = this.container.querySelectorAll("svg");
      zoomButtons[0].dataset["delta"] = "-1";
      zoomButtons[1].dataset["delta"] = "1";
      this.container.addEventListener("mousedown", this);
      window.addEventListener("mouseup", this);
      this.container.addEventListener("touchstart", this);
      window.addEventListener("touchend", this);
    }
    destroy() {
      window.removeEventListener("mouseup", this);
      window.removeEventListener("touchend", this);
      super.destroy();
    }
    handleEvent(e) {
      switch (e.type) {
        case "mousedown":
        case "touchstart": {
          const button = import_core5.utils.getClosest(e.target, "svg");
          const delta = button?.dataset["delta"];
          if (delta) {
            cancelAnimationFrame(this.animation);
            this.handler.down();
            this.time = performance.now();
            this.animateZoom(parseInt(delta, 10));
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }
        case "mouseup":
        case "touchend":
          if (this.animation) {
            this.handler.up(() => {
              cancelAnimationFrame(this.animation);
              this.animation = null;
            });
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        default:
          break;
      }
    }
    setText(zoom) {
      this.zoomIndicator.innerText = `${Math.round(Math.exp(zoom) * 100)}%`;
    }
    animateZoom(delta) {
      this.animation = requestAnimationFrame((t) => {
        this.map.zoom(delta * (t - this.time) / 1e3);
        this.time = t;
        this.animateZoom(delta);
      });
    }
  };

  // src/components/MapComponent.ts
  var MapComponent = class extends import_core6.AbstractComponent {
    constructor(viewer, plugin) {
      super(viewer, {
        className: `psv-map ${import_core6.CONSTANTS.CAPTURE_EVENTS_CLASS}`
      });
      this.plugin = plugin;
      this.state = {
        visible: false,
        maximized: false,
        collapsed: false,
        imgScale: 1,
        zoom: this.config.defaultZoom,
        offset: { x: 0, y: 0 },
        mouseX: null,
        mouseY: null,
        mousedown: false,
        pinchDist: 0,
        pinchAngle: 0,
        hotspotPos: {},
        hotspotId: null,
        hotspotTooltip: null,
        markers: [],
        forceRender: false,
        needsUpdate: false,
        renderLoop: null,
        images: {}
      };
      const canvasContainer = document.createElement("div");
      canvasContainer.className = "psv-map__container";
      canvasContainer.addEventListener("mousedown", this);
      window.addEventListener("mousemove", this);
      window.addEventListener("mouseup", this);
      canvasContainer.addEventListener("touchstart", this);
      window.addEventListener("touchmove", this);
      window.addEventListener("touchend", this);
      canvasContainer.addEventListener("wheel", this);
      viewer.addEventListener(import_core6.events.KeypressEvent.type, this);
      this.canvas = document.createElement("canvas");
      this.__setCursor("move");
      canvasContainer.appendChild(this.canvas);
      this.overlay = document.createElement("div");
      this.overlay.className = "psv-map__overlay";
      canvasContainer.appendChild(this.overlay);
      this.container.appendChild(canvasContainer);
      this.container.addEventListener("transitionstart", this);
      this.container.addEventListener("transitionend", this);
      if (this.config.buttons.reset) {
        this.resetButton = new MapResetButton(this);
      }
      if (this.config.buttons.maximize) {
        this.maximizeButton = new MapMaximizeButton(this);
      }
      if (this.config.buttons.close) {
        this.closeButton = new MapCloseButton(this);
      }
      if (this.config.buttons.north) {
        this.compassButton = new MapCompassButton(this);
      }
      this.zoomToolbar = new MapZoomToolbar(this);
      const renderLoop = () => {
        if (this.isVisible() && (this.state.needsUpdate || this.state.forceRender)) {
          this.render();
          this.state.needsUpdate = false;
        }
        this.state.renderLoop = requestAnimationFrame(renderLoop);
      };
      renderLoop();
      this.applyConfig();
      this.hide();
      if (!this.config.visibleOnLoad) {
        this.toggleCollapse();
      }
    }
    get config() {
      return this.plugin.config;
    }
    get maximized() {
      return this.state.maximized;
    }
    get collapsed() {
      return this.state.collapsed;
    }
    destroy() {
      this.canvas.width = 0;
      this.canvas.height = 0;
      window.removeEventListener("touchmove", this);
      window.removeEventListener("mousemove", this);
      window.removeEventListener("touchend", this);
      window.removeEventListener("mouseup", this);
      this.viewer.removeEventListener(import_core6.events.KeypressEvent.type, this);
      cancelAnimationFrame(this.state.renderLoop);
      super.destroy();
    }
    handleEvent(e) {
      if (import_core6.utils.getClosest(e.target, `.${import_core6.CONSTANTS.CAPTURE_EVENTS_CLASS}:not(.psv-map)`)) {
        return;
      }
      switch (e.type) {
        case import_core6.events.KeypressEvent.type:
          if (this.state.maximized) {
            this.__onKeyPress(e.key);
            e.preventDefault();
          }
          break;
        case "mousedown": {
          const event = e;
          this.state.mouseX = event.clientX;
          this.state.mouseY = event.clientY;
          this.state.mousedown = true;
          e.stopPropagation();
          break;
        }
        case "touchstart": {
          const event = e;
          if (event.touches.length === 1) {
            this.state.mouseX = event.touches[0].clientX;
            this.state.mouseY = event.touches[0].clientY;
            this.state.mousedown = true;
          } else if (event.touches.length === 2) {
            ({
              distance: this.state.pinchDist,
              angle: this.state.pinchAngle,
              center: { x: this.state.mouseX, y: this.state.mouseY }
            } = import_core6.utils.getTouchData(event));
          }
          e.stopPropagation();
          e.preventDefault();
          break;
        }
        case "mousemove": {
          const event = e;
          if (this.state.mousedown) {
            this.__move(event.clientX, event.clientY);
            e.stopPropagation();
          } else if (e.target === this.canvas) {
            this.__handleHotspots(event.clientX, event.clientY);
          }
          break;
        }
        case "touchmove": {
          const event = e;
          if (this.state.mousedown && event.touches.length === 1) {
            this.__move(event.touches[0].clientX, event.touches[0].clientY);
            e.stopPropagation();
          } else if (this.state.mousedown && event.touches.length === 2) {
            const touchData = import_core6.utils.getTouchData(event);
            const delta = (touchData.distance - this.state.pinchDist) / import_core6.SYSTEM.pixelRatio;
            this.zoom(delta / 100);
            this.__move(touchData.center.x, touchData.center.y);
            if (this.state.maximized && !this.config.static) {
              this.viewer.dynamics.position.step({ yaw: this.state.pinchAngle - touchData.angle }, 0);
            }
            ({ distance: this.state.pinchDist, angle: this.state.pinchAngle } = touchData);
            e.stopPropagation();
          }
          break;
        }
        case "mouseup":
        case "touchend": {
          const mouse = e.changedTouches?.[0] || e;
          if (this.state.mousedown) {
            this.state.mousedown = false;
            e.stopPropagation();
          }
          if (e.target === this.canvas) {
            this.__clickHotspot(mouse.clientX, mouse.clientY);
          }
          break;
        }
        case "wheel": {
          const event = e;
          const delta = event.deltaY / Math.abs(event.deltaY);
          if (event.ctrlKey) {
            this.viewer.dynamics.position.step({ yaw: delta / 10 });
          } else {
            this.zoom(-delta / 10);
          }
          e.stopPropagation();
          e.preventDefault();
          break;
        }
        case "transitionstart":
          this.state.forceRender = true;
          break;
        case "transitionend":
          if (!this.state.maximized) {
            this.overlay.style.display = "";
            this.recenter();
          }
          this.state.forceRender = false;
          this.update();
          break;
      }
    }
    applyConfig() {
      this.container.classList.remove(
        "psv-map--top-right",
        "psv-map--top-left",
        "psv-map--bottom-right",
        "psv-map--bottom-left"
      );
      this.container.classList.add(`psv-map--${this.config.position.join("-")}`);
      this.container.style.width = this.config.size;
      this.container.style.height = this.config.size;
      this.overlay.innerHTML = getImageHtml(this.config.overlayImage);
      this.resetButton?.applyConfig();
      this.closeButton?.applyConfig();
      this.compassButton?.applyConfig();
      this.maximizeButton?.applyConfig();
      if (this.config.static) {
        this.compassButton?.rotate(0);
        this.overlay.style.transform = "";
      }
      this.update();
    }
    isVisible() {
      return this.state.visible && !this.state.collapsed;
    }
    show() {
      super.show();
      this.update();
      if (!this.state.maximized) {
        this.overlay.style.display = "";
      }
    }
    hide() {
      super.hide();
      this.state.forceRender = false;
    }
    /**
     * Flag for render
     */
    update(clear = true) {
      this.state.needsUpdate = true;
      if (clear) {
        this.state.hotspotPos = {};
        this.__resetHotspot();
      }
    }
    /**
     * Load a new map image
     */
    reload(url) {
      delete this.state.images[this.config.imageUrl];
      this.config.imageUrl = url;
      this.state.imgScale = 1;
      this.__loadImage(this.config.imageUrl, true);
      this.recenter();
    }
    /**
     * Clears the offset and zoom level
     */
    reset() {
      this.state.zoom = this.config.defaultZoom;
      this.recenter();
    }
    /**
     * Clears the offset
     */
    recenter() {
      this.state.offset.x = 0;
      this.state.offset.y = 0;
      this.update();
    }
    /**
     * Switch collapsed mode
     */
    toggleCollapse() {
      if (this.state.maximized) {
        this.toggleMaximized();
      }
      this.state.collapsed = !this.state.collapsed;
      import_core6.utils.toggleClass(this.container, "psv-map--collapsed", this.state.collapsed);
      if (!this.state.collapsed) {
        this.reset();
      }
      this.closeButton?.update();
    }
    /**
     * Switch maximized mode
     */
    toggleMaximized() {
      if (this.state.collapsed) {
        return;
      }
      this.state.maximized = !this.state.maximized;
      import_core6.utils.toggleClass(this.container, "psv-map--maximized", this.state.maximized);
      if (this.state.maximized) {
        this.overlay.style.display = "none";
      }
      this.maximizeButton?.update();
    }
    /**
     * Changes the zoom level
     */
    zoom(d) {
      this.state.zoom = import_three.MathUtils.clamp(this.state.zoom + d, this.config.minZoom, this.config.maxZoom);
      this.update();
    }
    /**
     * Updates the markers
     */
    setMarkers(markers) {
      this.state.markers = markers;
      this.update();
    }
    /**
     * Changes the highlighted hotspot
     */
    setActiveHotspot(hotspotId) {
      this.state.hotspotId = hotspotId;
      this.update(false);
    }
    render() {
      if (!this.config.center) {
        return;
      }
      const mapImage = this.__loadImage(this.config.imageUrl);
      if (!mapImage) {
        return;
      }
      const yaw = this.viewer.getPosition().yaw;
      const zoom = Math.exp(this.state.zoom) / this.state.imgScale;
      const center = {
        x: this.config.center.x * this.state.imgScale,
        y: this.config.center.y * this.state.imgScale
      };
      const offset = {
        x: this.state.offset.x * this.state.imgScale,
        y: this.state.offset.y * this.state.imgScale
      };
      const rotation = this.config.rotation;
      const yawAndRotation = this.config.static ? 0 : yaw + rotation;
      if (!this.config.static) {
        this.overlay.style.transform = `rotate(${-yawAndRotation}rad)`;
        this.compassButton?.rotate(yawAndRotation);
      }
      this.zoomToolbar.setText(this.state.zoom);
      this.canvas.width = this.container.clientWidth * import_core6.SYSTEM.pixelRatio;
      this.canvas.height = this.container.clientHeight * import_core6.SYSTEM.pixelRatio;
      const canvasPos = import_core6.utils.getPosition(this.canvas);
      const canvasW = this.canvas.width;
      const canvasH = this.canvas.height;
      const canvasVirtualCenterX = canvasW / 2 / import_core6.SYSTEM.pixelRatio;
      const canvasVirtualCenterY = canvasH / 2 / import_core6.SYSTEM.pixelRatio;
      const context = this.canvas.getContext("2d");
      context.clearRect(0, 0, canvasW, canvasH);
      const mapW = mapImage.width;
      const mapH = mapImage.height;
      context.save();
      context.translate(canvasW / 2, canvasH / 2);
      context.rotate(-yawAndRotation);
      context.scale(zoom, zoom);
      canvasShadow(context, 0, 0, MAP_SHADOW_BLUR);
      drawImageHighDpi(
        context,
        mapImage,
        -center.x - offset.x,
        -center.y - offset.y,
        mapW,
        mapH
      );
      context.restore();
      [...this.config.hotspots, ...this.state.markers].forEach((hotspot) => {
        const isHover = this.state.hotspotId === hotspot.id;
        const style = getStyle(this.config.spotStyle, hotspot, isHover);
        const image = this.__loadImage(style.image);
        const hotspotPos = { ...offset };
        if ("yaw" in hotspot && "distance" in hotspot) {
          const angle = import_core6.utils.parseAngle(hotspot.yaw) + rotation;
          hotspotPos.x += Math.sin(-angle) * hotspot.distance * this.state.imgScale;
          hotspotPos.y += Math.cos(-angle) * hotspot.distance * this.state.imgScale;
        } else if ("x" in hotspot && "y" in hotspot) {
          hotspotPos.x += center.x - hotspot.x * this.state.imgScale;
          hotspotPos.y += center.y - hotspot.y * this.state.imgScale;
        } else {
          import_core6.utils.logWarn(`Hotspot ${hotspot["id"]} is missing position (yaw+distance or x+y)`);
          return;
        }
        const spotPos = projectPoint(hotspotPos, yawAndRotation, zoom);
        const x = canvasVirtualCenterX - spotPos.x;
        const y = canvasVirtualCenterY - spotPos.y;
        this.state.hotspotPos[hotspot.id] = {
          x: x + canvasPos.x,
          y: y + canvasPos.y,
          s: style.size
        };
        context.save();
        context.translate(x * import_core6.SYSTEM.pixelRatio, y * import_core6.SYSTEM.pixelRatio);
        canvasShadow(context, PIN_SHADOW_OFFSET, PIN_SHADOW_OFFSET, PIN_SHADOW_BLUR);
        if (image) {
          drawImageCentered(context, image, style.size);
        } else {
          context.fillStyle = style.color;
          context.beginPath();
          context.arc(0, 0, style.size * import_core6.SYSTEM.pixelRatio / 2, 0, 2 * Math.PI);
          context.fill();
          if (style.borderColor && style.borderSize) {
            context.shadowColor = "transparent";
            context.strokeStyle = style.borderColor;
            context.lineWidth = style.borderSize;
            context.beginPath();
            context.arc(0, 0, (style.size + style.borderSize) * import_core6.SYSTEM.pixelRatio / 2, 0, 2 * Math.PI);
            context.stroke();
          }
        }
        context.restore();
      });
      const pinImage = this.__loadImage(this.config.pinImage);
      if (pinImage || this.config.coneColor && this.config.coneSize) {
        const pinPos = projectPoint(offset, yawAndRotation, zoom);
        const x = canvasVirtualCenterX - pinPos.x;
        const y = canvasVirtualCenterY - pinPos.y;
        const size = this.config.pinSize;
        const angle = this.config.static ? yaw + rotation : 0;
        context.save();
        context.translate(x * import_core6.SYSTEM.pixelRatio, y * import_core6.SYSTEM.pixelRatio);
        context.rotate(angle);
        if (this.config.coneColor && this.config.coneSize) {
          const fov = import_three.MathUtils.degToRad(this.viewer.state.hFov);
          const a1 = -Math.PI / 2 - fov / 2;
          const a2 = a1 + fov;
          const c = this.config.coneSize;
          const grad = context.createRadialGradient(0, 0, c / 4, 0, 0, c);
          grad.addColorStop(0, this.config.coneColor);
          grad.addColorStop(1, rgbToRgba(this.config.coneColor, 0));
          context.beginPath();
          context.moveTo(0, 0);
          context.lineTo(Math.cos(a1) * c, Math.sin(a1) * c);
          context.arc(0, 0, c, a1, a2, false);
          context.lineTo(0, 0);
          context.fillStyle = grad;
          context.fill();
        }
        if (pinImage) {
          canvasShadow(context, PIN_SHADOW_OFFSET, PIN_SHADOW_OFFSET, PIN_SHADOW_BLUR);
          drawImageCentered(context, pinImage, size);
        }
        context.restore();
      }
    }
    /**
     * Applies mouse movement to the map
     */
    __move(clientX, clientY) {
      const yaw = this.viewer.getPosition().yaw;
      const zoom = Math.exp(this.state.zoom);
      const move = unprojectPoint(
        {
          x: this.state.mouseX - clientX,
          y: this.state.mouseY - clientY
        },
        this.config.static ? 0 : yaw + this.config.rotation,
        zoom
      );
      this.state.offset.x += move.x;
      this.state.offset.y += move.y;
      this.update();
      this.state.mouseX = clientX;
      this.state.mouseY = clientY;
    }
    /**
     * Finds the hotspot under the mouse
     */
    __findHotspot(clientX, clientY) {
      const k = this.config.spotStyle.size / 2;
      let hotspotId = null;
      for (const [id, { x, y }] of Object.entries(this.state.hotspotPos)) {
        if (clientX > x - k && clientX < x + k && clientY > y - k && clientY < y + k) {
          hotspotId = id;
          break;
        }
      }
      return hotspotId;
    }
    /**
     * Updates current hotspot on mouse move and displays tooltip
     */
    __handleHotspots(clientX, clientY) {
      const hotspotId = this.__findHotspot(clientX, clientY);
      if (this.state.hotspotId !== hotspotId) {
        this.__resetHotspot();
        if (hotspotId) {
          let tooltip;
          if (hotspotId.startsWith(HOTSPOT_MARKER_ID)) {
            tooltip = this.state.markers.find(({ id }) => id === hotspotId)?.tooltip;
          } else {
            tooltip = this.config.hotspots.find(({ id }) => id === hotspotId)?.tooltip;
          }
          if (tooltip) {
            if (typeof tooltip === "string") {
              tooltip = { content: tooltip };
            }
            const hotspotPos = this.state.hotspotPos[hotspotId];
            const viewerPos = import_core6.utils.getPosition(this.viewer.container);
            this.state.hotspotTooltip = this.viewer.createTooltip({
              content: tooltip.content,
              className: tooltip.className,
              left: hotspotPos.x - viewerPos.x,
              top: hotspotPos.y - viewerPos.y,
              box: {
                width: hotspotPos.s,
                height: hotspotPos.s
              }
            });
          }
        }
        this.setActiveHotspot(hotspotId);
        this.__setCursor(hotspotId ? "pointer" : "move");
      }
    }
    /**
     * Dispatch event when a hotspot is clicked
     */
    __clickHotspot(clientX, clientY) {
      const hotspotId = this.__findHotspot(clientX, clientY);
      if (hotspotId) {
        this.plugin.dispatchEvent(new SelectHotspot(hotspotId));
        if (hotspotId.startsWith(HOTSPOT_MARKER_ID)) {
          const markerId = hotspotId.substring(HOTSPOT_MARKER_ID.length);
          this.viewer.getPlugin("markers").gotoMarker(markerId);
        }
        if (this.maximized) {
          this.toggleMaximized();
        }
      }
      this.__resetHotspot();
    }
    __resetHotspot() {
      this.state.hotspotTooltip?.hide();
      this.state.hotspotTooltip = null;
      this.state.hotspotId = null;
    }
    /**
     * Loads an image and returns the result **synchronously**.
     * If the image is not already loaded it returns `null` and schedules a new render when the image is ready.
     */
    __loadImage(url, isInit = false) {
      if (!url) {
        return null;
      }
      if (!this.state.images[url]) {
        const image = loadImage(url);
        this.state.images[url] = {
          loading: true,
          value: image
        };
        image.onload = () => {
          if (isInit && Math.max(image.width, image.height) > import_core6.SYSTEM.maxCanvasWidth) {
            this.state.imgScale = import_core6.SYSTEM.maxCanvasWidth / Math.max(image.width, image.height);
            const buffer = document.createElement("canvas");
            buffer.width = image.width * this.state.imgScale;
            buffer.height = image.height * this.state.imgScale;
            const ctx = buffer.getContext("2d");
            ctx.drawImage(image, 0, 0, buffer.width, buffer.height);
            this.state.images[url].value = buffer;
          }
          this.state.images[url].loading = false;
          this.update(false);
          if (isInit) {
            this.show();
          }
        };
        return null;
      }
      if (this.state.images[url].loading) {
        return null;
      }
      return this.state.images[url].value;
    }
    __onKeyPress(key) {
      if (key === import_core6.CONSTANTS.KEY_CODES.Escape) {
        this.toggleMaximized();
        return;
      }
      if (!this.viewer.state.keyboardEnabled) {
        return;
      }
      let x = 0;
      let y = 0;
      let z = 0;
      switch (key) {
        case import_core6.CONSTANTS.KEY_CODES.ArrowUp:
          y = 1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.ArrowDown:
          y = -1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.ArrowLeft:
          x = 1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.ArrowRight:
          x = -1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.Plus:
          z = 1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.Minus:
          z = -1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.PageUp:
          z = 1;
          break;
        case import_core6.CONSTANTS.KEY_CODES.PageDown:
          z = -1;
          break;
      }
      if (x || y) {
        this.state.mouseX = 0;
        this.state.mouseY = 0;
        this.__move(x * 10, y * 10);
      }
      if (z) {
        this.zoom(z / 10);
      }
    }
    __setCursor(cursor) {
      this.canvas.style.cursor = cursor;
    }
  };

  // src/overlay.svg
  var overlay_default = '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">\n    <defs>\n        <radialGradient id="gradient">\n            <stop offset="80%" stop-color="rgba(255, 255, 255, 0)"/>\n            <stop offset="90%" stop-color="rgba(255, 255, 255, .5)"/>\n        </radialGradient>\n    </defs>\n    <circle cx="250" cy="250" r="250" fill="url(#gradient)"/>\n    <circle cx="250" cy="250" r="245" fill="none" stroke="rgba(255, 255, 255, 0.8)" stroke-width="10"/>\n    <g fill="#222">\n        <rect x="1" y="248" width="18" height="4"/>\n        <rect x="481" y="248" width="18" height="4"/>\n        <rect x="248" y="1" width="4" height="18"/>\n        <rect x="248" y="481" width="4" height="18"/>\n    </g>\n</svg>';

  // src/icons/pin.svg
  var pin_default = '<svg viewBox="-20 -20 740 740" xmlns="http://www.w3.org/2000/svg">\n    <circle cx="350" cy="350" r="190" fill="white"/>\n    <circle cx="350" cy="350" r="150" fill="#1E78E6"/>\n</svg>\n';

  // src/MapPlugin.ts
  var getConfig = import_core7.utils.getConfigParser(
    {
      imageUrl: null,
      center: null,
      rotation: 0,
      size: "200px",
      position: ["bottom", "left"],
      visibleOnLoad: true,
      overlayImage: overlay_default,
      pinImage: pin_default,
      pinSize: 35,
      coneColor: "#1E78E6",
      coneSize: 40,
      spotStyle: {
        size: 15,
        image: null,
        color: "white",
        hoverSize: null,
        hoverImage: null,
        hoverColor: null,
        hoverBorderSize: 4,
        hoverBorderColor: "rgba(255, 255, 255, 0.6)"
      },
      static: false,
      defaultZoom: 100,
      minZoom: 20,
      maxZoom: 200,
      hotspots: [],
      buttons: {
        maximize: true,
        close: true,
        reset: true,
        north: true
      }
    },
    {
      spotStyle: (spotStyle, { defValue }) => ({ ...defValue, ...spotStyle }),
      position: (position, { defValue }) => {
        return import_core7.utils.cleanCssPosition(position, { allowCenter: false, cssOrder: true }) || defValue;
      },
      rotation: (rotation) => import_core7.utils.parseAngle(rotation),
      coneColor: (coneColor) => coneColor ? new import_three2.Color(coneColor).getStyle() : null,
      defaultZoom: (defaultZoom) => Math.log(defaultZoom / 100),
      maxZoom: (maxZoom) => Math.log(maxZoom / 100),
      minZoom: (minZoom) => Math.log(minZoom / 100),
      buttons: (buttons, { defValue }) => ({ ...defValue, ...buttons })
    }
  );
  var MapPlugin = class extends import_core7.AbstractConfigurablePlugin {
    constructor(viewer, config) {
      super(viewer, config);
      this.component = new MapComponent(this.viewer, this);
    }
    /**
     * @internal
     */
    init() {
      super.init();
      import_core7.utils.checkStylesheet(this.viewer.container, "map-plugin");
      this.markers = this.viewer.getPlugin("markers");
      this.viewer.addEventListener(import_core7.events.PositionUpdatedEvent.type, this);
      this.viewer.addEventListener(import_core7.events.ZoomUpdatedEvent.type, this);
      this.viewer.addEventListener(import_core7.events.SizeUpdatedEvent.type, this);
      this.viewer.addEventListener(import_core7.events.ReadyEvent.type, this, { once: true });
      this.markers?.addEventListener("set-markers", this);
      this.setHotspots(this.config.hotspots, false);
    }
    /**
     * @internal
     */
    destroy() {
      this.viewer.removeEventListener(import_core7.events.PositionUpdatedEvent.type, this);
      this.viewer.removeEventListener(import_core7.events.ZoomUpdatedEvent.type, this);
      this.viewer.removeEventListener(import_core7.events.SizeUpdatedEvent.type, this);
      this.viewer.removeEventListener(import_core7.events.ReadyEvent.type, this);
      this.markers?.removeEventListener("set-markers", this);
      this.component.destroy();
      delete this.markers;
      super.destroy();
    }
    /**
     * @internal
     */
    handleEvent(e) {
      switch (e.type) {
        case import_core7.events.ReadyEvent.type:
          this.component.reload(this.config.imageUrl);
          break;
        case import_core7.events.PositionUpdatedEvent.type:
        case import_core7.events.ZoomUpdatedEvent.type:
          this.component.update();
          break;
        case import_core7.events.SizeUpdatedEvent.type:
          if (this.component.maximized) {
            this.component.update();
          }
          break;
        case "set-markers":
          this.component.setMarkers(this.__markersToHotspots(e.markers));
          break;
        default:
          break;
      }
    }
    setOptions(options) {
      super.setOptions(options);
      if (options.center) {
        this.component.recenter();
      }
      if (options.hotspots !== void 0) {
        this.setHotspots(options.hotspots);
      }
      this.component.applyConfig();
    }
    /**
     * Hides the map
     */
    hide() {
      this.component.hide();
    }
    /**
     * Shows the map
     */
    show() {
      this.component.show();
    }
    /**
     * Closes the map
     */
    close() {
      if (!this.component.collapsed) {
        this.component.toggleCollapse();
      }
    }
    /**
     * Open the map
     */
    open() {
      if (this.component.collapsed) {
        this.component.toggleCollapse();
      }
    }
    /**
     * Minimizes the map
     */
    minimize() {
      if (this.component.maximized) {
        this.component.toggleMaximized();
      }
    }
    /**
     * Maximizes the map
     */
    maximize() {
      if (!this.component.maximized) {
        this.component.toggleMaximized();
      }
    }
    /**
     * Changes the image of the map
     * @param rotation Also change the image rotation
     * @param center Also change the position on the map
     */
    setImage(url, center, rotation) {
      if (!import_core7.utils.isNil(rotation)) {
        this.config.rotation = import_core7.utils.parseAngle(rotation);
      }
      if (!import_core7.utils.isNil(center)) {
        this.config.center = center;
      }
      this.component.reload(url);
    }
    /**
     * Changes the position on the map
     */
    setCenter(center) {
      this.config.center = center;
      this.component.recenter();
    }
    /**
     * Changes the hotspots on the map
     */
    setHotspots(hotspots, render = true) {
      const ids = [];
      let i = 1;
      hotspots?.forEach((hotspot) => {
        if (!hotspot.id) {
          hotspot.id = HOTSPOT_GENERATED_ID + i++;
        } else if (ids.includes(hotspot.id)) {
          import_core7.utils.logWarn(`Duplicated hotspot id "${hotspot.id}`);
        } else {
          ids.push(hotspot.id);
        }
      });
      this.config.hotspots = hotspots || [];
      if (render) {
        this.component.update();
      }
    }
    /**
     * Removes all hotspots
     */
    clearHotspots() {
      this.setHotspots(null);
    }
    /**
     * Changes the highlighted hotspot
     */
    setActiveHotspot(hotspotId) {
      this.component.setActiveHotspot(hotspotId);
    }
    __markersToHotspots(markers) {
      return markers.filter((marker) => marker.data?.[MARKER_DATA_KEY]).map((marker) => {
        const hotspot = {
          ...marker.data[MARKER_DATA_KEY],
          id: HOTSPOT_MARKER_ID + marker.id,
          tooltip: marker.config.tooltip
        };
        if ("distance" in hotspot) {
          hotspot.yaw = marker.state.position.yaw;
        } else if (!("x" in hotspot) || !("y" in hotspot)) {
          import_core7.utils.logWarn(`Marker #${marker.id} "map" data is missing position (distance or x+y)`);
          return null;
        }
        return hotspot;
      }).filter((h) => h);
    }
  };
  MapPlugin.id = "map";
  MapPlugin.VERSION = "5.7.4";
  MapPlugin.configParser = getConfig;
  MapPlugin.readonlyOptions = [
    "imageUrl",
    "visibleOnLoad",
    "defaultZoom",
    "buttons"
  ];

  // src/index.ts
  import_core8.DEFAULTS.lang["map"] = "Map";
  import_core8.DEFAULTS.lang["mapMaximize"] = "Maximize";
  import_core8.DEFAULTS.lang["mapMinimize"] = "Minimize";
  import_core8.DEFAULTS.lang["mapNorth"] = "Go to north";
  import_core8.DEFAULTS.lang["mapReset"] = "Reset";
  __copyProps(__defProp(exports, "__esModule", { value: true }), src_exports);

}));//# sourceMappingURL=index.js.map