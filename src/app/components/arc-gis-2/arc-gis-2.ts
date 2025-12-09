import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import Map from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js';
import Graphic from '@arcgis/core/Graphic.js';
import TextSymbol from '@arcgis/core/symbols/TextSymbol.js';
import Polyline from '@arcgis/core/geometry/Polyline';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';

@Component({
  selector: 'app-arc-gis-2',
  templateUrl: './arc-gis-2.html',
  styleUrls: ['./arc-gis-2.scss'],
})

export class ArcGis2 implements AfterViewInit, OnDestroy {
  @ViewChild('mapView', { static: true }) private mapViewEl!: ElementRef<HTMLDivElement>;
  private view!: MapView;
  private graphicsLayer!: GraphicsLayer;
  private labelLayer!: GraphicsLayer;
  private sketchVM!: SketchViewModel;
  private vertexCount = 0;

  ngAfterViewInit(): void {
    this.graphicsLayer = new GraphicsLayer();
    this.labelLayer = new GraphicsLayer(); // 👈 for vertex numbers

    const map = new Map({
      basemap: 'streets-vector',
      layers: [this.graphicsLayer, this.labelLayer],
    });

    this.view = new MapView({
      container: this.mapViewEl.nativeElement,
      map,
      center: [77.5946, 12.9716],
      zoom: 11,
      ui: { components: ['attribution'] },
    });

    this.sketchVM = new SketchViewModel({
      view: this.view,
      layer: this.graphicsLayer,
      defaultCreateOptions: { mode: 'click' },
      defaultUpdateOptions: { toggleToolOnClick: false },
      polylineSymbol: { type: 'simple-line', color: '#2563eb', width: 2 } as any,
      polygonSymbol: { type: 'simple-fill', color: [37, 99, 235, 0.12], outline: { color: '#2563eb', width: 2 } } as any,
    });

    this.sketchVM.on('create', (event: any) => {
      if (event.state === 'start') {
        this.labelLayer.removeAll();
        this.vertexCount = 0;
        this.vertexCount++;
        const geom = event.graphic.geometry;
        event.graphic.attributes = { sketchNumber: this.vertexCount };
        if (geom.type === 'polygon' || geom.type === 'polyline') {
          // this.refreshAllVertexLabels();
        }
      }

      if (event.toolEventInfo && event.toolEventInfo.type === 'vertex-add') {
        this.vertexCount++;
        const vertex = event.toolEventInfo.added[0];
        // this.refreshAllVertexLabels();
      }

      if (event.state === 'complete') {
        this.vertexCount = 0;
      }
    });
  }

  // private refreshAllVertexLabels() {
  //   this.labelLayer.removeAll();
  //   for (const g of this.graphicsLayer.graphics.toArray()) {
  //     console.log(g.geometry);

  //     this.updateVertexLabels(g.geometry);
  //   }
  // }

  // private addVertexLabel(point: any, number: number) {
  //   const labelGraphic = new Graphic({
  //     geometry: point,
  //     symbol: new TextSymbol({
  //       text: number.toString(),
  //       color: 'black',
  //       haloColor: 'white',
  //       haloSize: '2px',
  //       font: { size: 12, weight: 'bold' },
  //       yoffset: -10,
  //     }),
  //   });
  //   this.labelLayer.add(labelGraphic);
  // }

  private updateVertexLabels(geom: any) {
    this.labelLayer.removeAll();
    if (!geom) return;

    const sr = geom.spatialReference;
    let idx = 1;

    if (geom.type === 'polygon') {
      (geom as Polygon).rings.forEach((ring) => {
        if (!ring?.length) return;
        const first = ring[0];
        const last = ring[ring.length - 1];
        const isClosedDup =
          first[0] === last[0] && first[1] === last[1];
        const len = isClosedDup ? ring.length - 1 : ring.length;

        for (let i = 0; i < len; i++) {
          const [x, y] = ring[i];
          const pt = new Point({ x, y, spatialReference: sr });

          const sym = new TextSymbol({
            text: String(idx++),
            font: { size: 10, family: 'monospace', weight: 'bold' },
            haloColor: 'white',
            haloSize: 2,
            yoffset: -10,
          });

          this.labelLayer.add(
            new Graphic({ geometry: pt, symbol: sym })
          );
        }
      });
    }
    // else if (geom.type === 'polyline') {
    //   (geom as Polyline).paths.forEach((path) => {
    //     for (let i = 0; i < path.length; i++) {
    //       const [x, y] = path[i];
    //       const pt = new Point({ x, y, spatialReference: sr });

    //       const sym = new TextSymbol({
    //         text: String(idx++),
    //         font: { size: 10, family: 'monospace', weight: 'bold' },
    //         haloColor: 'white',
    //         haloSize: 2,
    //         yoffset: -10,
    //       });

    //       this.labelLayer.add(
    //         new Graphic({ geometry: pt, symbol: sym })
    //       );
    //     }
    //   });
    // }
  }

  startPolyline(): void {
    this.sketchVM.cancel();
    this.sketchVM.create('polyline', { mode: 'click' });
  }

  startPolygon(): void {
    this.sketchVM.cancel();
    this.sketchVM.create('polygon', { mode: 'click' });
  }

  enableEdit(): void {
    const all = this.graphicsLayer.graphics.toArray();
    if (all.length) {
      this.sketchVM.update(all, { tool: 'reshape', enableRotation: true, enableScaling: true });
    }
  }

  undo(): void {
    if (this.sketchVM.canUndo()) this.sketchVM.undo();
  }

  redo(): void {
    if (this.sketchVM.canRedo()) this.sketchVM.redo();
  }

  finish(): void {
    this.sketchVM.complete();
  }

  cancel(): void {
    this.sketchVM.cancel();
    this.labelLayer.removeAll();
  }

  delete(): void {
    this.sketchVM.delete();
    this.labelLayer.removeAll();
  }

  clear(): void {
    this.sketchVM.cancel();
    this.graphicsLayer.removeAll();
    this.labelLayer.removeAll();
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }
}
