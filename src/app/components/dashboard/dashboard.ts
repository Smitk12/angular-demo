import { Component, ElementRef, ViewChild, NgZone, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Sketch from '@arcgis/core/widgets/Sketch';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import Point from '@arcgis/core/geometry/Point';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import Polyline from '@arcgis/core/geometry/Polyline';
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Dashboard {
  @ViewChild('mapViewEl', { static: true }) private mapViewEl!: ElementRef<HTMLDivElement>;

  private view!: MapView;
  private drawLayer = new GraphicsLayer({ title: 'Drawn Polygons' });
  private labelLayer = new GraphicsLayer({ title: 'Vertex Numbers' });

  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(async () => {
      const map = new Map({
        basemap: 'streets-navigation-vector',
        layers: [this.drawLayer, this.labelLayer]
      });

      this.view = new MapView({
        container: this.mapViewEl.nativeElement,
        map,
        center: [78.9629, 20.5937],
        zoom: 4,
      });

      await this.view.when();

      const sketch = new Sketch({
        layer: this.drawLayer,
        view: this.view,
        creationMode: 'update',
        visibleElements: { createTools: { polygon: true }, selectionTools: { 'lasso-selection': false } }
      });

      this.view.ui.add(sketch, 'top-right');
      await this.loadSavedSketches();

      sketch.on('create', (evt) => {
        if (evt.tool !== 'polygon') return;
        if (evt.state === 'start' || evt.state === 'active') {
          this.updateVertexLabels(evt.graphic.geometry as Polygon);
        }
        if (evt.state === 'complete') {
          this.updateVertexLabels(evt.graphic.geometry as Polygon);
        }
      });

      // Redraw numbers during edits (move vertex, add/remove, reshape, etc.)
      sketch.on('update', (evt) => {
        if (!evt.graphics?.length) return;
        const g = evt.graphics[0];
        const geom = g.geometry as Polygon;

        // During interactive edits, events fire a *lot* — throttle with rAF.
        this.raf(() => this.updateVertexLabels(geom));

        if (evt.state === 'complete') {
          this.updateVertexLabels(geom);
        }
      });

      // Optional: refresh labels when the view scale changes (keeps screen-size text sensible)
      //   watchUtils.pausable(this.view, 'scale', () => {
      //     const g = this.drawLayer.graphics.at(0);
      //     if (g?.geometry?.type === 'polygon') this.updateVertexLabels(g.geometry as Polygon);
      //   });
    });
  }

  private onSketchEvent(evt: any): void {
    if (!evt?.graphic?.geometry) return;
    const geom = evt.graphic.geometry;

    if (['active', 'start', 'complete'].includes(evt.state)) {
      this.raf(() => this.updateVertexLabels(geom));
    }
  }

  private updateVertexLabels(poly: Polygon | Polyline | null | undefined) {
    this.labelLayer.removeAll();
    if (!poly || poly.type !== 'polygon') return;

    const sr = poly.spatialReference;
    let idx = 1;

    poly.rings.forEach((ring) => {
      if (!ring?.length) return;

      const first = ring[0];
      const last = ring[ring.length - 1];
      const isClosedDup = first[0] === last[0] && first[1] === last[1];
      const len = isClosedDup ? ring.length - 1 : ring.length;

      for (let i = 0; i < len; i++) {
        const [x, y] = ring[i];
        const pt = new Point({ x, y, spatialReference: sr });

        const sym = new TextSymbol({
          text: String(idx++),
          font: { size: 10, family: 'monospace', weight: 'bold' },
          haloColor: 'white',
          haloSize: 2,
          yoffset: -10
        });

        this.labelLayer.add(new Graphic({ geometry: pt, symbol: sym }));
      }
    });
  }

  saveMap() {
    if (!this.drawLayer) {
      console.warn('Graphics layer not initialized.');
      return;
    }

    const all = this.drawLayer.graphics.toArray();
    const mainGraphics = all.filter((g: { attributes: { __isVertexLabel: any; }; }) => !g.attributes?.__isVertexLabel);

    const geometries = mainGraphics.map((g: { geometry: any; attributes: {}; }) => {
      const geom: any = g.geometry;
      const attrs = g.attributes || {};
      if (geom.type === 'point') {
        return {
          type: 'point',
          lat: geom.latitude,
          lon: geom.longitude,
          attrs
        };
      }
      if (geom.type === 'polyline') {
        return { type: 'polyline', paths: geom.paths, attrs };
      }
      if (geom.type === 'polygon') {
        return { type: 'polygon', rings: geom.rings, attrs };
      }
      return null;
    }).filter(Boolean);

    console.log('💾 Saving geometries:', geometries);

    localStorage.setItem('savedMapGeometries', JSON.stringify(geometries));
    alert('✅ Map saved!');
  }

  async loadSavedSketches() {
    const saved = localStorage.getItem('savedMapGeometries');
    console.log('📂 Loading saved geometries from localStorage:', saved);

    this.drawLayer.removeAll();

    if (!saved) return;

    try {
      const data = JSON.parse(saved) as any[];
      await this.view.when();

      for (const item of data) {
        let geometry: any;
        if (item.type === 'point') {
          geometry = new Point({
            latitude: item.lat,
            longitude: item.lon,
            spatialReference: this.view.spatialReference,
          });
        } else if (item.type === 'polyline') {
          geometry = new Polyline({ paths: item.paths, spatialReference: this.view.spatialReference });
        } else if (item.type === 'polygon') {
          geometry = new Polygon({ rings: item.rings, spatialReference: this.view.spatialReference });
        } else {
          continue;
        }

        const graphic = new Graphic({
          geometry,
          symbol: this.getSymbol(item.type),
          attributes: item.attrs ?? {}
        });

        this.drawLayer.add(graphic);
        if (item.type === 'polyline' || item.type === 'polygon') {
        }
      }

      console.log('✅ Loaded saved sketches from localStorage');
    } catch (error) {
      console.error('Error loading saved geometries:', error);
    }
  }

  private getSymbol(type: string): any {
    switch (type) {
      case 'point':
        return {
          type: 'simple-marker',
          color: [226, 119, 40],
          outline: { color: [255, 255, 255], width: 1 },
          size: 10,
        };
      case 'polyline':
        return { type: 'simple-line', color: [226, 119, 40], width: 3 };
      case 'polygon':
        return {
          type: 'simple-fill',
          color: [226, 119, 40, 0.2],
          outline: { color: [226, 119, 40], width: 2 },
        };
      default:
        return null;
    }
  }

  clearMap() {
    this.drawLayer.removeAll();
    localStorage.removeItem('savedMapGeometries');
    alert('🗑️ Cleared map & storage');
  }

  private pending = false;
  private raf(fn: () => void) {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      fn();
    });
  }
}