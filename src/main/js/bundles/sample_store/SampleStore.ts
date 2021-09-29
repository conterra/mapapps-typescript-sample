import { ComplexQueryExpression } from "store-api/api/ComplexQueryLang";
import {
    AsyncStore,
    Metadata,
    QueryOptions
} from "store-api/api/Store";
import { ComplexQuery } from "store-api/ComplexQuery";
import request from "apprt-request";
import Point from "esri/geometry/Point";

interface BusStop {
    id: string; // unique id
    title: string; // display attribute
    geometry: Point; // location
}

// Implements the AsyncStore interface. Our item type is `BusStop` and our id type is `string`.
// See https://demos.conterra.de/mapapps/resources/jsregistry/root/store-api/latest/README.md for more documentation.
export default class SampleStore implements AsyncStore<BusStop, string> {
    id: string;
    idProperty = "id";

    private _busStops: Promise<BusStop[]> | undefined;

    constructor(properties: Record<string, any>) {
        this.id = properties.id;
    }

    async query(query?: ComplexQueryExpression, options?: QueryOptions): Promise<BusStop[]> {
        const complexQuery = ComplexQuery.parse(query, options);
        const busStops = await this._getBusStops();
        return busStops.filter((stop) => complexQuery.test(stop));
    }

    async get(id: string): Promise<BusStop | undefined> {
        const busStops = await this._getBusStops();
        return busStops.find((stop) => stop.id === id);
    }

    async getMetadata(): Promise<Metadata> {
        return {
            supportsGeometry: true,
            fields: [
                {
                    name: "id",
                    type: "string",
                    identifier: true
                },
                {
                    name: "title",
                    type: "string",
                    title: "Title"
                }
            ]
        };
    }

    // Fetch data once on first use, then cache it in memory.
    // The REST service used here does not support search.
    private _getBusStops() {
        if (this._busStops) {
            return this._busStops;
        }
        return (this._busStops = loadBusStops());
    }
}

// Loads bus stops within the city of Münster.
async function loadBusStops(): Promise<BusStop[]> {
    const data = await request("https://rest.busradar.conterra.de/prod/haltestellen", {
        headers: {
            Accept: "application/json"
        }
    });
    if (data.message) {
        throw new Error(`Failed to load data from REST service: ${data.message}`);
    }

    const features: any[] = data.features;
    if (!features) {
        throw new Error(`Unexpected response from REST service: 'features' are missing`);
    }
    return features.map((feature) => transformFeature(feature));
}

// Maps a feature from the REST api to a BusStop object.
function transformFeature(feature: any): BusStop {
    const rawGeometry = feature.geometry;
    if (rawGeometry?.type !== "Point") {
        throw new Error(`Unexpected geometry type '${rawGeometry?.type}' in feature, expected 'Point'`);
    }

    return {
        id: feature.properties.nr,
        title: feature.properties.lbez,
        geometry: new Point({
            x: rawGeometry.coordinates[0],
            y: rawGeometry.coordinates[1],
            spatialReference: {
                wkid: 4326
            }
        })
    };
}
