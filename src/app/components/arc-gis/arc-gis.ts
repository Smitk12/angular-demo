import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import esriConfig from '@arcgis/core/config';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Sketch from '@arcgis/core/widgets/Sketch';
import Expand from '@arcgis/core/widgets/Expand';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Polygon from '@arcgis/core/geometry/Polygon';
import Graphic from '@arcgis/core/Graphic';

@Component({
  selector: 'app-arc-gis',
  imports: [CommonModule],
  templateUrl: './arc-gis.html',
  styleUrls: ['./arc-gis.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ArcGis implements OnInit, OnDestroy {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl!: ElementRef;
  private view!: MapView;
  private graphicsLayer!: GraphicsLayer;

  private uidCounter = 1;

  async ngOnInit() {
    try {
      esriConfig.apiKey = `AAPTxy8BH1VEsoebNVZXo8HurCLQigaSsR6TCUtAksLsg_OOxmLsbaX4hF_WP8EfeD_M6FeP8wpb3VVakhXZRPR0wiM-zeiWleEEWtSZOOK0UKFeCeTUqthBBQVI1rbowFeGPaNpXtPs7Wo0-F4wgJdEeM-Td4_i-zvZnILj-n20NzMrB56tcX9JAh197z6ermaxxujApeKAJ4r9Osw7eZ69S6FScCmywX9EUegO23EuP1A.AT1_MhdNSlZC`;

      this.graphicsLayer = new GraphicsLayer();
      const map = new Map({
        basemap: 'arcgis/topographic',
        layers: [this.graphicsLayer],
      });

      this.view = new MapView({
        container: this.mapViewEl.nativeElement,
        map,
        center: [78.9629, 20.5937],
        zoom: 4,
      });

      await this.view.when();
      console.log('🗺️ Map ready');

      const sketch: any = new Sketch({
        layer: this.graphicsLayer,
        view: this.view,
        creationMode: 'update',
        availableCreateTools: ['point', 'polyline', 'polygon'],
      });

      sketch.viewModel.vertexSymbol = {
        type: 'text',
        text: `${this.uidCounter}`,
        color: [226, 119, 40],
        haloColor: 'white',
        haloSize: 2,
        font: { size: 12, weight: 'bold' }
      };

      const sketchExpand = new Expand({
        view: this.view,
        content: sketch,
        expandIcon: 'pencil',
        expanded: true,
      });

      this.view.ui.add(sketchExpand, 'top-right');
      await this.loadSavedSketches();

      sketch.on('create', (event: any) => {
        if (event.state === 'complete' && event.graphic && event.graphic.geometry) {
          const geom = event.graphic.geometry;
          if (geom.type === 'polyline' || geom.type === 'polygon') {
          }
        }
      });

      sketch.on('update', (event: any) => {
        const g = event.graphics && event.graphics[0] ? event.graphics[0] : event.graphic;
        if (event.state === 'complete' && g && g.geometry) {
          if (g.geometry.type === 'polyline' || g.geometry.type === 'polygon') {
          }
        }
      });

      this.graphicsLayer.watch('graphics.length', () => {
      });

    } catch (error) {
      console.error('Error creating editable map:', error);
    }
  }

  saveMap() {
    if (!this.graphicsLayer) {
      console.warn('Graphics layer not initialized.');
      return;
    }

    const all = this.graphicsLayer.graphics.toArray();
    const mainGraphics = all.filter(g => !g.attributes?.__isVertexLabel);

    const geometries = mainGraphics.map(g => {
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

    localStorage.setItem('savedMapGeometries', JSON.stringify(geometries));
    alert('✅ Map saved!');
  }

  async loadSavedSketches() {
    const saved = localStorage.getItem('savedMapGeometries');
    this.graphicsLayer.removeAll();

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

        this.graphicsLayer.add(graphic);
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
    this.graphicsLayer.removeAll();
    localStorage.removeItem('savedMapGeometries');
    alert('🗑️ Cleared map & storage');
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.destroy();
    }
  }
}
