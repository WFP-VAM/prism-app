import React, { useEffect } from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { Source, Layer, MapRef } from 'react-map-gl/maplibre';

const AnticipatoryActionStormLayer = React.memo(
  ({ layer, mapRef }: LayersProps) => {
    useDefaultDate(layer.id);
    const timeSeries = {
      type: 'FeatureCollection',
      features: [
        {
          id: '0',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-01 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 27.78,
            maximum_wind_gust: 37.04,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [61.83, -11.18],
          },
          bbox: [61.83, -11.18, 61.83, -11.18],
        },
        {
          id: '1',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-01 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [62.03, -11.64],
          },
          bbox: [62.03, -11.64, 62.03, -11.64],
        },
        {
          id: '2',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-01 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [61.23, -12.39],
          },
          bbox: [61.23, -12.39, 61.23, -12.39],
        },
        {
          id: '3',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-02 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [59.25, -12.51],
          },
          bbox: [59.25, -12.51, 59.25, -12.51],
        },
        {
          id: '4',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-02 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [56.96, -12.13],
          },
          bbox: [56.96, -12.13, 56.96, -12.13],
        },
        {
          id: '5',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-02 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [55.38, -11.88],
          },
          bbox: [55.38, -11.88, 55.38, -11.88],
        },
        {
          id: '6',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-02 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [54.1, -11.7],
          },
          bbox: [54.1, -11.7, 54.1, -11.7],
        },
        {
          id: '7',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-03 00:00:00',
            development: 'tropical disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [52.82, -11.64],
          },
          bbox: [52.82, -11.64, 52.82, -11.64],
        },
        {
          id: '8',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-03 06:00:00',
            development: 'tropical depression',
            maximum_wind_speed: 55.56,
            maximum_wind_gust: 74.08,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [51.64, -11.84],
          },
          bbox: [51.64, -11.84, 51.64, -11.84],
        },
        {
          id: '9',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-03 12:00:00',
            development: 'tropical depression',
            maximum_wind_speed: 55.56,
            maximum_wind_gust: 74.08,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [50.82, -12.32],
          },
          bbox: [50.82, -12.32, 50.82, -12.32],
        },
        {
          id: '10',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-03 18:00:00',
            development: 'tropical disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [50.39, -12.86],
          },
          bbox: [50.39, -12.86, 50.39, -12.86],
        },
        {
          id: '11',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-04 00:00:00',
            development: 'tropical disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [48.0, -13.3],
          },
          bbox: [48.0, -13.3, 48.0, -13.3],
        },
        {
          id: '12',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-04 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [46.06, -13.6],
          },
          bbox: [46.06, -13.6, 46.06, -13.6],
        },
        {
          id: '13',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-04 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [45.4, -14.61],
          },
          bbox: [45.4, -14.61, 45.4, -14.61],
        },
        {
          id: '14',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-04 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [44.09, -16.09],
          },
          bbox: [44.09, -16.09, 44.09, -16.09],
        },
        {
          id: '15',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-05 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [42.55, -17.76],
          },
          bbox: [42.55, -17.76, 42.55, -17.76],
        },
        {
          id: '16',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-05 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [42.1, -18.88],
          },
          bbox: [42.1, -18.88, 42.1, -18.88],
        },
        {
          id: '17',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-05 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [42.01, -20.05],
          },
          bbox: [42.01, -20.05, 42.01, -20.05],
        },
        {
          id: '18',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-05 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.65, -21.24],
          },
          bbox: [41.65, -21.24, 41.65, -21.24],
        },
        {
          id: '19',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-06 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.32, -21.88],
          },
          bbox: [41.32, -21.88, 41.32, -21.88],
        },
        {
          id: '20',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-06 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.12, -22.31],
          },
          bbox: [41.12, -22.31, 41.12, -22.31],
        },
        {
          id: '21',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-06 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.34, -22.69],
          },
          bbox: [41.34, -22.69, 41.34, -22.69],
        },
        {
          id: '22',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-06 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.52, -22.85],
          },
          bbox: [41.52, -22.85, 41.52, -22.85],
        },
        {
          id: '23',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-07 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.67, -22.91],
          },
          bbox: [41.67, -22.91, 41.67, -22.91],
        },
        {
          id: '24',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-07 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.83, -22.97],
          },
          bbox: [41.83, -22.97, 41.83, -22.97],
        },
        {
          id: '25',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-07 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [42.01, -22.94],
          },
          bbox: [42.01, -22.94, 42.01, -22.94],
        },
        {
          id: '26',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-07 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [42.09, -22.85],
          },
          bbox: [42.09, -22.85, 42.09, -22.85],
        },
        {
          id: '27',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-08 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.76, -23.46],
          },
          bbox: [41.76, -23.46, 41.76, -23.46],
        },
        {
          id: '28',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-08 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [40.97, -23.73],
          },
          bbox: [40.97, -23.73, 40.97, -23.73],
        },
        {
          id: '29',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-08 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.16, -23.36],
          },
          bbox: [41.16, -23.36, 41.16, -23.36],
        },
        {
          id: '30',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-08 18:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.65, -23.29],
          },
          bbox: [41.65, -23.29, 41.65, -23.29],
        },
        {
          id: '31',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-09 00:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.5, -23.07],
          },
          bbox: [41.5, -23.07, 41.5, -23.07],
        },
        {
          id: '32',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-09 06:00:00',
            development: 'disturbance',
            maximum_wind_speed: 37.04,
            maximum_wind_gust: 55.56,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.14, -22.38],
          },
          bbox: [41.14, -22.38, 41.14, -22.38],
        },
        {
          id: '33',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-09 12:00:00',
            development: 'disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.1, -21.47],
          },
          bbox: [41.1, -21.47, 41.1, -21.47],
        },
        {
          id: '34',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-09 18:00:00',
            development: 'tropical disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.2, -20.3],
          },
          bbox: [41.2, -20.3, 41.2, -20.3],
        },
        {
          id: '35',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-10 00:00:00',
            development: 'tropical disturbance',
            maximum_wind_speed: 46.300000000000004,
            maximum_wind_gust: 64.82000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [41.14, -20.26],
          },
          bbox: [41.14, -20.26, 41.14, -20.26],
        },
        {
          id: '36',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-10 06:00:00',
            development: 'tropical depression',
            maximum_wind_speed: 55.56,
            maximum_wind_gust: 74.08,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [39.67, -20.25],
          },
          bbox: [39.67, -20.25, 39.67, -20.25],
        },
        {
          id: '37',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-10 12:00:00',
            development: 'tropical depression',
            maximum_wind_speed: 55.56,
            maximum_wind_gust: 74.08,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [39.05, -20.12],
          },
          bbox: [39.05, -20.12, 39.05, -20.12],
        },
        {
          id: '38',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-10 18:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 74.08,
            maximum_wind_gust: 101.86,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [38.39, -20.1],
          },
          bbox: [38.39, -20.1, 38.39, -20.1],
        },
        {
          id: '39',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-11 00:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 74.08,
            maximum_wind_gust: 101.86,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [37.71, -20.13],
          },
          bbox: [37.71, -20.13, 37.71, -20.13],
        },
        {
          id: '40',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-11 06:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 74.08,
            maximum_wind_gust: 101.86,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [37.0, -20.36],
          },
          bbox: [37.0, -20.36, 37.0, -20.36],
        },
        {
          id: '41',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-11 12:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 83.34,
            maximum_wind_gust: 120.38000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [36.49, -20.43],
          },
          bbox: [36.49, -20.43, 36.49, -20.43],
        },
        {
          id: '42',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-11 18:00:00',
            development: 'severe tropical storm',
            maximum_wind_speed: 101.86,
            maximum_wind_gust: 148.16,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [36.07, -20.52],
          },
          bbox: [36.07, -20.52, 36.07, -20.52],
        },
        {
          id: '43',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-12 00:00:00',
            development: 'severe tropical storm',
            maximum_wind_speed: 101.86,
            maximum_wind_gust: 148.16,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [35.47, -21.1],
          },
          bbox: [35.47, -21.1, 35.47, -21.1],
        },
        {
          id: '44',
          type: 'Feature',
          properties: {
            data_type: 'analysis',
            time: '2024-03-12 06:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 83.34,
            maximum_wind_gust: 120.38000000000001,
            wind_buffer_48: null,
            wind_buffer_64: null,
          },
          geometry: {
            type: 'Point',
            coordinates: [35.08, -21.77],
          },
          bbox: [35.08, -21.77, 35.08, -21.77],
        },
        {
          id: '45',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-12 06:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 83.34,
            maximum_wind_gust: 120.38000000000001,
            wind_buffer_48:
              'POLYGON ((35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77))',
            wind_buffer_64:
              'POLYGON ((35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77, 35.08 -21.77))',
          },
          geometry: {
            type: 'Point',
            coordinates: [35.08, -21.77],
          },
          bbox: [35.08, -21.77, 35.08, -21.77],
        },
        {
          id: '46',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-12 18:00:00',
            development: 'inland',
            maximum_wind_speed: 64.82000000000001,
            maximum_wind_gust: 92.60000000000001,
            wind_buffer_48:
              'POLYGON ((34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2))',
            wind_buffer_64:
              'POLYGON ((34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2, 34.02 -23.2))',
          },
          geometry: {
            type: 'Point',
            coordinates: [34.02, -23.2],
          },
          bbox: [34.02, -23.2, 34.02, -23.2],
        },
        {
          id: '47',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-13 06:00:00',
            development: 'moderate tropical storm',
            maximum_wind_speed: 74.08,
            maximum_wind_gust: 101.86,
            wind_buffer_48:
              'POLYGON ((33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64))',
            wind_buffer_64:
              'POLYGON ((33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64, 33.73 -25.64))',
          },
          geometry: {
            type: 'Point',
            coordinates: [33.73, -25.64],
          },
          bbox: [33.73, -25.64, 33.73, -25.64],
        },
        {
          id: '48',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-13 18:00:00',
            development: 'severe tropical storm',
            maximum_wind_speed: 92.60000000000001,
            maximum_wind_gust: 129.64000000000001,
            wind_buffer_48:
              'POLYGON ((36.08228530362918 -27.83, 36.08103858609707 -27.791916719037925, 36.07730377213664 -27.753996516531586, 36.071096854794625 -27.71640177260972, 36.06244441304399 -27.679293473737463, 36.05138349796867 -27.642830523347545, 36.03796147410512 -27.607169061391435, 36.022235816620096 -27.572461795724077, 36.004273865193205 -27.53885734818541, 35.98415253565802 -27.506499618178847, 35.961957990636705 -27.475527166471924, 35.937785270578395 -27.446072621857827, 35.91173788678146 -27.41826211321854, 35.88392737814217 -27.3922147294216, 35.85447283352808 -27.368042009363293, 35.823500381821155 -27.345847464341976, 35.79114265181459 -27.325726134806796, 35.757538204275924 -27.307764183379906, 35.72283093860856 -27.29203852589488, 35.68716947665245 -27.278616502031326, 35.65070652626253 -27.267555586956004, 35.61359822739028 -27.258903145205377, 35.57600348346841 -27.25269622786336, 35.53808328096207 -27.248961413902926, 35.5 -27.24771469637082, 35.5 -27.33089831117499, 35.46735718774679 -27.331966926202508, 35.434854157027075 -27.335168195311454, 35.40263009080834 -27.340488410176036, 35.370822977489254 -27.34790478881943, 35.339569020012185 -27.357385573169708, 35.30900205262123 -27.368890165052754, 35.2792529677635 -27.38236930003992, 35.250449155587496 -27.397765258405826, 35.222713958439016 -27.415012112293123, 35.196166142690224 -27.434036008025682, 35.17091939016385 -27.45475548236137, 35.147081811330175 -27.477081811330176, 35.12475548236137 -27.50091939016385, 35.10403600802568 -27.52616614269022, 35.08501211229312 -27.55271395843901, 35.06776525840583 -27.580449155587495, 35.05236930003992 -27.609252967763492, 35.038890165052756 -27.63900205262123, 35.02738557316971 -27.669569020012183, 35.017904788819436 -27.700822977489253, 35.01048841017604 -27.732630090808335, 35.005168195311455 -27.764854157027074, 35.001966926202506 -27.797357187746794, 35.00089831117499 -27.83, 34.91771469637082 -27.83, 34.91896141390293 -27.86808328096207, 34.92269622786336 -27.90600348346841, 34.928903145205375 -27.943598227390275, 34.93755558695601 -27.980706526262534, 34.94861650203133 -28.01716947665245, 34.96203852589488 -28.05283093860856, 34.977764183379904 -28.08753820427592, 34.995726134806795 -28.121142651814587, 35.01584746434198 -28.15350038182115, 35.038042009363295 -28.184472833528073, 35.062214729421605 -28.21392737814217, 35.08826211321854 -28.241737886781458, 35.11607262185783 -28.267785270578397, 35.14552716647192 -28.291957990636703, 35.176499618178845 -28.31415253565802, 35.20885734818541 -28.3342738651932, 35.242461795724076 -28.35223581662009, 35.27716906139144 -28.367961474105115, 35.31283052334755 -28.38138349796867, 35.34929347373747 -28.392444413043993, 35.38640177260972 -28.40109685479462, 35.42399651653159 -28.407303772136636, 35.46191671903793 -28.41103858609707, 35.5 -28.412285303629176, 35.5 -28.329101688825006, 35.53264281225321 -28.32803307379749, 35.565145842972925 -28.324831804688543, 35.59736990919166 -28.31951158982396, 35.629177022510746 -28.312095211180566, 35.660430979987815 -28.30261442683029, 35.69099794737877 -28.291109834947243, 35.7207470322365 -28.277630699960078, 35.749550844412504 -28.26223474159417, 35.777286041560984 -28.244987887706873, 35.803833857309776 -28.225963991974314, 35.82908060983615 -28.205244517638626, 35.852918188669825 -28.18291818866982, 35.87524451763863 -28.159080609836145, 35.89596399197432 -28.133833857309778, 35.91498788770688 -28.107286041560986, 35.93223474159417 -28.079550844412502, 35.94763069996008 -28.050747032236504, 35.961109834947244 -28.020997947378767, 35.97261442683029 -27.990430979987813, 35.982095211180564 -27.959177022510744, 35.98951158982396 -27.927369909191665, 35.994831804688545 -27.895145842972923, 35.998033073797494 -27.862642812253203, 35.99910168882501 -27.83, 36.08228530362918 -27.83))',
            wind_buffer_64:
              'POLYGON ((35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83, 35.5 -27.83))',
          },
          geometry: {
            type: 'Point',
            coordinates: [35.5, -27.83],
          },
          bbox: [35.5, -27.83, 35.5, -27.83],
        },
        {
          id: '49',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-14 06:00:00',
            development: 'severe tropical storm',
            maximum_wind_speed: 111.12,
            maximum_wind_gust: 157.42000000000002,
            wind_buffer_48:
              'POLYGON ((39.55865253323751 -30.61, 39.55704961069624 -30.56103578162019, 39.55224770703282 -30.512281235540613, 39.544267384735946 -30.4639451362125, 39.53314281677085 -30.416234466233885, 39.51892164024544 -30.369353530018277, 39.501664752420865 -30.32350307893185, 39.481446049940125 -30.278879451645242, 39.45835211239126 -30.235673733381244, 39.43248183156032 -30.19407093765852, 39.40394598796148 -30.15424921403533, 39.37286677645794 -30.11637908524578, 39.33937728300474 -30.080622716995265, 39.30362091475422 -30.04713322354206, 39.26575078596467 -30.016054012038524, 39.225929062341486 -29.987518168439685, 39.18432626661876 -29.961647887608738, 39.141120548354756 -29.93855395005988, 39.09649692106815 -29.918335247579137, 39.05064646998173 -29.90107835975456, 39.00376553376612 -29.88685718322915, 38.9560548637875 -29.875732615264056, 38.90771876445939 -29.867752292967182, 38.85896421837981 -29.862950389303762, 38.81 -29.861347466762485, 38.81 -30.027714696370822, 38.77191671903793 -30.028961413902927, 38.73399651653159 -30.03269622786336, 38.696401772609725 -30.038903145205378, 38.65929347373747 -30.047555586956005, 38.62283052334755 -30.058616502031327, 38.58716906139144 -30.072038525894882, 38.55246179572408 -30.087764183379907, 38.51885734818541 -30.105726134806797, 38.486499618178854 -30.125847464341977, 38.455527166471924 -30.148042009363294, 38.426072621857834 -30.1722147294216, 38.39826211321854 -30.19826211321854, 38.37221472942161 -30.226072621857828, 38.3480420093633 -30.255527166471925, 38.32584746434198 -30.286499618178848, 38.3057261348068 -30.31885734818541, 38.287764183379906 -30.35246179572408, 38.272038525894885 -30.387169061391436, 38.25861650203133 -30.422830523347546, 38.24755558695601 -30.459293473737464, 38.23890314520538 -30.496401772609723, 38.232696227863364 -30.533996516531587, 38.22896141390293 -30.571916719037926, 38.227714696370825 -30.61, 38.310898311174995 -30.61, 38.31196692620251 -30.642642812253204, 38.31516819531146 -30.675145842972924, 38.32048841017604 -30.707369909191662, 38.32790478881944 -30.739177022510745, 38.33738557316971 -30.770430979987815, 38.34889016505276 -30.800997947378768, 38.36236930003992 -30.830747032236506, 38.37776525840583 -30.859550844412503, 38.395012112293124 -30.887286041560987, 38.41403600802568 -30.91383385730978, 38.434755482361375 -30.939080609836147, 38.45708181133018 -30.96291818866982, 38.480919390163855 -30.985244517638627, 38.506166142690226 -31.005963991974316, 38.53271395843902 -31.024987887706875, 38.5604491555875 -31.04223474159417, 38.5892529677635 -31.05763069996008, 38.619002052621234 -31.071109834947244, 38.64956902001219 -31.08261442683029, 38.68082297748926 -31.092095211180567, 38.71263009080834 -31.099511589823962, 38.74485415702708 -31.104831804688544, 38.777357187746794 -31.10803307379749, 38.81 -31.109101688825007, 38.81 -31.192285303629177, 38.84808328096207 -31.191038586097072, 38.886003483468414 -31.187303772136637, 38.92359822739028 -31.18109685479462, 38.960706526262534 -31.172444413043994, 38.99716947665245 -31.16138349796867, 39.03283093860856 -31.147961474105117, 39.06753820427593 -31.132235816620092, 39.10114265181459 -31.1142738651932, 39.13350038182115 -31.094152535658022, 39.16447283352808 -31.071957990636704, 39.19392737814217 -31.047785270578398, 39.22173788678146 -31.02173788678146, 39.2477852705784 -30.99392737814217, 39.27195799063671 -30.964472833528074, 39.29415253565802 -30.93350038182115, 39.31427386519321 -30.901142651814588, 39.3322358166201 -30.86753820427592, 39.34796147410512 -30.832830938608563, 39.361383497968674 -30.797169476652453, 39.37244441304399 -30.760706526262535, 39.38109685479463 -30.723598227390276, 39.38730377213664 -30.68600348346841, 39.391038586097075 -30.648083280962073, 39.39228530362918 -30.61, 39.55865253323751 -30.61))',
            wind_buffer_64:
              'POLYGON ((38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61, 38.81 -30.61))',
          },
          geometry: {
            type: 'Point',
            coordinates: [38.81, -30.61],
          },
          bbox: [38.81, -30.61, 38.81, -30.61],
        },
        {
          id: '50',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-14 18:00:00',
            development: 'tropical cyclone',
            maximum_wind_speed: 129.64000000000001,
            maximum_wind_gust: 185.20000000000002,
            wind_buffer_48:
              'POLYGON ((45.018652533237514 -33.78, 45.01704961069624 -33.73103578162019, 45.01224770703282 -33.682281235540614, 45.00426738473595 -33.6339451362125, 44.993142816770856 -33.58623446623388, 44.97892164024544 -33.539353530018275, 44.961664752420866 -33.49350307893185, 44.941446049940126 -33.44887945164525, 44.91835211239126 -33.40567373338124, 44.89248183156032 -33.36407093765852, 44.86394598796148 -33.32424921403533, 44.83286677645794 -33.286379085245784, 44.79937728300474 -33.25062271699527, 44.76362091475422 -33.21713322354206, 44.72575078596467 -33.186054012038525, 44.685929062341486 -33.15751816843969, 44.64432626661876 -33.13164788760874, 44.60112054835476 -33.10855395005988, 44.55649692106815 -33.08833524757914, 44.51064646998173 -33.071078359754566, 44.46376553376612 -33.056857183229155, 44.4160548637875 -33.04573261526406, 44.36771876445939 -33.037752292967184, 44.31896421837981 -33.032950389303764, 44.27 -33.03134746676249, 44.27 -33.197714696370824, 44.23191671903793 -33.19896141390293, 44.19399651653159 -33.20269622786336, 44.156401772609726 -33.208903145205376, 44.11929347373747 -33.21755558695601, 44.08283052334755 -33.22861650203133, 44.04716906139144 -33.242038525894884, 44.01246179572408 -33.257764183379905, 43.978857348185414 -33.275726134806796, 43.946499618178855 -33.29584746434198, 43.915527166471925 -33.318042009363296, 43.886072621857835 -33.342214729421606, 43.858262113218544 -33.36826211321854, 43.83221472942161 -33.39607262185783, 43.8080420093633 -33.42552716647192, 43.785847464341984 -33.456499618178846, 43.7657261348068 -33.48885734818541, 43.74776418337991 -33.52246179572408, 43.732038525894886 -33.55716906139144, 43.71861650203133 -33.59283052334755, 43.70755558695601 -33.62929347373747, 43.69890314520538 -33.666401772609724, 43.692696227863365 -33.70399651653159, 43.68896141390293 -33.74191671903793, 43.687714696370826 -33.78, 43.604531081566655 -33.78, 43.605955901603345 -33.82352374967094, 43.61022426041527 -33.8668611239639, 43.61731788023472 -33.909826545588885, 43.627206385092585 -33.952236030014326, 43.63984743089295 -33.993907973317086, 43.65518688673701 -34.03466392983836, 43.6731590667199 -34.07432937631534, 43.69368701120777 -34.112734459216675, 43.716682816390836 -34.14971472208132, 43.74204801070091 -34.185111809746374, 43.76967397648183 -34.2187741464482, 43.79944241510691 -34.250557584893095, 43.83122585355181 -34.28032602351817, 43.86488819025363 -34.30795198929909, 43.900285277918684 -34.33331718360917, 43.93726554078333 -34.35631298879223, 43.975670623684664 -34.37684093328011, 44.015336070161645 -34.39481311326299, 44.05609202668292 -34.410152569107055, 44.09776396998568 -34.42279361490742, 44.14017345441112 -34.43268211976528, 44.183138876036104 -34.43977573958473, 44.226476250329064 -34.44404409839666, 44.27 -34.44546891843335, 44.27 -34.36228530362918, 44.30808328096207 -34.361038586097074, 44.346003483468415 -34.35730377213664, 44.38359822739028 -34.351096854794626, 44.420706526262535 -34.34244441304399, 44.45716947665245 -34.33138349796867, 44.49283093860856 -34.31796147410512, 44.52753820427593 -34.3022358166201, 44.56114265181459 -34.28427386519321, 44.59350038182115 -34.26415253565802, 44.62447283352808 -34.241957990636706, 44.65392737814217 -34.2177852705784, 44.68173788678146 -34.19173788678146, 44.7077852705784 -34.16392737814217, 44.73195799063671 -34.13447283352808, 44.75415253565802 -34.103500381821156, 44.77427386519321 -34.07114265181459, 44.7922358166201 -34.037538204275926, 44.80796147410512 -34.00283093860856, 44.821383497968675 -33.96716947665245, 44.832444413043994 -33.93070652626253, 44.84109685479463 -33.89359822739028, 44.84730377213664 -33.85600348346841, 44.851038586097076 -33.81808328096207, 44.85228530362918 -33.78, 45.018652533237514 -33.78))',
            wind_buffer_64:
              'POLYGON ((44.76910168882501 -33.78, 44.7680330737975 -33.74735718774679, 44.76483180468855 -33.71485415702708, 44.759511589823965 -33.68263009080834, 44.75209521118057 -33.650822977489256, 44.74261442683029 -33.619569020012186, 44.73110983494725 -33.58900205262123, 44.71763069996008 -33.5592529677635, 44.702234741594175 -33.5304491555875, 44.68498788770688 -33.50271395843902, 44.66596399197432 -33.476166142690225, 44.64524451763863 -33.450919390163854, 44.62291818866983 -33.427081811330176, 44.59908060983615 -33.404755482361374, 44.57383385730978 -33.38403600802568, 44.54728604156099 -33.36501211229312, 44.51955084441251 -33.34776525840583, 44.490747032236506 -33.33236930003992, 44.46099794737877 -33.31889016505276, 44.43043097998782 -33.30738557316971, 44.39917702251075 -33.29790478881944, 44.367369909191666 -33.29048841017604, 44.33514584297293 -33.285168195311456, 44.30264281225321 -33.28196692620251, 44.27 -33.280898311174994, 44.27 -33.36408192597916, 44.242797656455664 -33.36497243850209, 44.215711797522566 -33.36764016275955, 44.18885840900695 -33.3720736751467, 44.16235248124105 -33.378253990682865, 44.13630751667682 -33.38615464430809, 44.11083504385103 -33.39574180421063, 44.086044139802915 -33.40697441669993, 44.062040962989585 -33.419804382004855, 44.03892829869918 -33.43417676024427, 44.01680511890852 -33.45003000668807, 43.995766158469884 -33.46729623530115, 43.97590150944182 -33.48590150944182, 43.95729623530115 -33.50576615846988, 43.94003000668807 -33.52680511890852, 43.92417676024427 -33.54892829869918, 43.90980438200486 -33.57204096298958, 43.89697441669993 -33.59604413980291, 43.88574180421063 -33.62083504385103, 43.876154644308095 -33.64630751667682, 43.86825399068287 -33.67235248124105, 43.8620736751467 -33.698858409006945, 43.85764016275955 -33.725711797522564, 43.854972438502095 -33.75279765645566, 43.85408192597916 -33.78, 43.770898311174996 -33.78, 43.77196692620251 -33.81264281225321, 43.77516819531146 -33.845145842972926, 43.78048841017604 -33.877369909191664, 43.78790478881944 -33.90917702251075, 43.79738557316971 -33.940430979987816, 43.80889016505276 -33.97099794737877, 43.822369300039924 -34.000747032236504, 43.83776525840583 -34.029550844412505, 43.855012112293124 -34.057286041560985, 43.87403600802568 -34.08383385730978, 43.894755482361376 -34.10908060983615, 43.91708181133018 -34.13291818866983, 43.940919390163856 -34.15524451763863, 43.96616614269023 -34.17596399197432, 43.99271395843902 -34.19498788770688, 44.0204491555875 -34.21223474159417, 44.0492529677635 -34.22763069996008, 44.079002052621234 -34.241109834947245, 44.10956902001219 -34.25261442683029, 44.14082297748926 -34.262095211180565, 44.17263009080834 -34.26951158982396, 44.20485415702708 -34.274831804688546, 44.237357187746795 -34.278033073797495, 44.27 -34.27910168882501, 44.27 -34.195918074020845, 44.29720234354434 -34.19502756149791, 44.32428820247744 -34.19235983724045, 44.35114159099306 -34.1879263248533, 44.377647518758955 -34.18174600931714, 44.403692483323184 -34.17384535569191, 44.42916495614897 -34.16425819578937, 44.45395586019709 -34.15302558330007, 44.47795903701042 -34.14019561799515, 44.50107170130082 -34.12582323975573, 44.523194881091484 -34.109969993311935, 44.54423384153012 -34.092703764698854, 44.56409849055819 -34.074098490558185, 44.582703764698856 -34.05423384153012, 44.59996999331194 -34.03319488109148, 44.615823239755734 -34.01107170130082, 44.63019561799515 -33.98795903701042, 44.64302558330007 -33.96395586019709, 44.654258195789374 -33.93916495614897, 44.66384535569191 -33.91369248332318, 44.67174600931714 -33.88764751875895, 44.6779263248533 -33.86114159099306, 44.682359837240455 -33.83428820247744, 44.68502756149791 -33.80720234354434, 44.68591807402085 -33.78, 44.76910168882501 -33.78))',
          },
          geometry: {
            type: 'Point',
            coordinates: [44.27, -33.78],
          },
          bbox: [44.27, -33.78, 44.27, -33.78],
        },
        {
          id: '51',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-15 06:00:00',
            development: 'post-tropical depression',
            maximum_wind_speed: 111.12,
            maximum_wind_gust: 157.42000000000002,
            wind_buffer_48:
              'POLYGON ((50.88183614804168 -36.31, 50.88005512299582 -36.255595312911325, 50.87471967448091 -36.20142359504513, 50.8658526497066 -36.1477168180139, 50.85349201863428 -36.0947049624821, 50.837690711383814 -36.04261503335364, 50.81851639157873 -35.991670087702055, 50.79605116660013 -35.94208827960583, 50.77039123599029 -35.89408192597916, 50.74164647951146 -35.847856597398355, 50.70993998662386 -35.80361023781704, 50.67540752939771 -35.76153231693976, 50.638196981116366 -35.721803018883634, 50.59846768306024 -35.68459247060229, 50.55638976218296 -35.65006001337614, 50.512143402601644 -35.61835352048854, 50.46591807402084 -35.58960876400971, 50.41791172039417 -35.56394883339987, 50.368329912297945 -35.54148360842127, 50.31738496664636 -35.522309288616185, 50.2652950375179 -35.50650798136572, 50.2122831819861 -35.494147350293396, 50.15857640495487 -35.48528032551909, 50.104404687088675 -35.47994487700418, 50.05 -35.47816385195832, 50.05 -35.727714696370825, 50.01191671903793 -35.72896141390293, 49.973996516531585 -35.732696227863364, 49.93640177260972 -35.73890314520538, 49.899293473737465 -35.74755558695601, 49.86283052334755 -35.75861650203133, 49.82716906139144 -35.772038525894885, 49.79246179572407 -35.787764183379906, 49.75885734818541 -35.8057261348068, 49.72649961817885 -35.82584746434198, 49.69552716647192 -35.8480420093633, 49.66607262185783 -35.87221472942161, 49.63826211321854 -35.89826211321854, 49.6122147294216 -35.926072621857834, 49.58804200936329 -35.955527166471924, 49.56584746434198 -35.98649961817885, 49.54572613480679 -36.01885734818541, 49.5277641833799 -36.05246179572408, 49.51203852589488 -36.08716906139144, 49.498616502031325 -36.12283052334755, 49.487555586956006 -36.15929347373747, 49.47890314520537 -36.196401772609725, 49.47269622786336 -36.23399651653159, 49.468961413902925 -36.27191671903793, 49.46771469637082 -36.31, 49.55089831117499 -36.31, 49.5519669262025 -36.34264281225321, 49.55516819531145 -36.37514584297293, 49.560488410176035 -36.407369909191665, 49.56790478881943 -36.43917702251075, 49.57738557316971 -36.47043097998782, 49.58889016505275 -36.50099794737877, 49.60236930003992 -36.530747032236505, 49.617765258405825 -36.559550844412506, 49.63501211229312 -36.587286041560986, 49.65403600802568 -36.61383385730978, 49.67475548236137 -36.63908060983615, 49.69708181133017 -36.66291818866983, 49.72091939016385 -36.68524451763863, 49.74616614269022 -36.70596399197432, 49.77271395843901 -36.72498788770688, 49.80044915558749 -36.742234741594174, 49.829252967763495 -36.75763069996008, 49.85900205262123 -36.77110983494725, 49.88956902001218 -36.78261442683029, 49.92082297748925 -36.792095211180566, 49.952630090808334 -36.799511589823965, 49.98485415702707 -36.80483180468855, 50.01735718774679 -36.808033073797496, 50.05 -36.80910168882501, 50.05 -36.97546891843335, 50.093523749670936 -36.97404409839666, 50.1368611239639 -36.96977573958473, 50.17982654558888 -36.96268211976528, 50.22223603001432 -36.95279361490742, 50.26390797331708 -36.940152569107056, 50.304663929838355 -36.92481311326299, 50.344329376315336 -36.90684093328011, 50.38273445921667 -36.886312988792234, 50.419714722081316 -36.86331718360917, 50.45511180974637 -36.83795198929909, 50.48877414644819 -36.81032602351817, 50.52055758489309 -36.780557584893096, 50.55032602351817 -36.7487741464482, 50.57795198929909 -36.715111809746375, 50.603317183609164 -36.67971472208132, 50.62631298879223 -36.642734459216676, 50.6468409332801 -36.60432937631534, 50.66481311326299 -36.56466392983836, 50.68015256910705 -36.52390797331709, 50.692793614907416 -36.48223603001433, 50.70268211976528 -36.439826545588886, 50.70977573958473 -36.3968611239639, 50.714044098396656 -36.35352374967094, 50.715468918433345 -36.31, 50.88183614804168 -36.31))',
            wind_buffer_64:
              'POLYGON ((50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31, 50.05 -36.31))',
          },
          geometry: {
            type: 'Point',
            coordinates: [50.05, -36.31],
          },
          bbox: [50.05, -36.31, 50.05, -36.31],
        },
        {
          id: '52',
          type: 'Feature',
          properties: {
            data_type: 'forecast',
            time: '2024-03-15 18:00:00',
            development: 'extratropical system',
            maximum_wind_speed: 92.60000000000001,
            maximum_wind_gust: 129.64000000000001,
            wind_buffer_48:
              'POLYGON ((56.45183614804168 -38.34, 56.45005512299582 -38.285595312911326, 56.44471967448091 -38.23142359504513, 56.435852649706604 -38.1777168180139, 56.42349201863428 -38.1247049624821, 56.407690711383815 -38.07261503335364, 56.38851639157873 -38.021670087702056, 56.36605116660013 -37.97208827960583, 56.34039123599029 -37.92408192597916, 56.31164647951146 -37.877856597398356, 56.27993998662386 -37.83361023781704, 56.24540752939771 -37.79153231693976, 56.208196981116366 -37.751803018883635, 56.16846768306024 -37.71459247060229, 56.12638976218296 -37.68006001337614, 56.082143402601645 -37.64835352048854, 56.03591807402084 -37.61960876400971, 55.98791172039417 -37.59394883339987, 55.938329912297945 -37.57148360842127, 55.88738496664636 -37.552309288616186, 55.8352950375179 -37.53650798136572, 55.7822831819861 -37.5241473502934, 55.72857640495487 -37.51528032551909, 55.674404687088675 -37.50994487700418, 55.62 -37.50816385195832, 55.62 -37.674531081566656, 55.57647625032906 -37.675955901603345, 55.5331388760361 -37.68022426041527, 55.490173454411114 -37.68731788023472, 55.44776396998567 -37.697206385092585, 55.40609202668291 -37.70984743089295, 55.36533607016164 -37.72518688673701, 55.32567062368466 -37.7431590667199, 55.287265540783324 -37.76368701120777, 55.25028527791868 -37.78668281639084, 55.214888190253625 -37.81204801070091, 55.1812258535518 -37.83967397648183, 55.149442415106904 -37.86944241510691, 55.11967397648183 -37.90122585355181, 55.09204801070091 -37.93488819025363, 55.06668281639083 -37.970285277918684, 55.043687011207766 -38.00726554078333, 55.02315906671989 -38.045670623684664, 55.00518688673701 -38.085336070161645, 54.989847430892944 -38.12609202668292, 54.97720638509258 -38.16776396998568, 54.96731788023472 -38.21017345441112, 54.960224260415266 -38.253138876036104, 54.95595590160334 -38.296476250329064, 54.95453108156665 -38.34, 55.03771469637082 -38.34, 55.038961413902925 -38.37808328096207, 55.04269622786336 -38.416003483468415, 55.04890314520537 -38.45359822739028, 55.057555586956006 -38.490706526262535, 55.068616502031325 -38.52716947665245, 55.08203852589488 -38.56283093860856, 55.0977641833799 -38.59753820427593, 55.11572613480679 -38.63114265181459, 55.13584746434198 -38.66350038182115, 55.15804200936329 -38.69447283352808, 55.1822147294216 -38.72392737814217, 55.20826211321854 -38.75173788678146, 55.23607262185783 -38.7777852705784, 55.26552716647192 -38.80195799063671, 55.29649961817884 -38.82415253565802, 55.32885734818541 -38.84427386519321, 55.36246179572407 -38.8622358166201, 55.39716906139144 -38.87796147410512, 55.43283052334755 -38.891383497968675, 55.469293473737466 -38.902444413043995, 55.50640177260972 -38.91109685479463, 55.543996516531585 -38.91730377213664, 55.58191671903793 -38.921038586097076, 55.62 -38.92228530362918, 55.62 -39.00546891843335, 55.66352374967094 -39.00404409839666, 55.7068611239639 -38.999775739584734, 55.74982654558888 -38.992682119765284, 55.79223603001432 -38.98279361490742, 55.83390797331708 -38.97015256910706, 55.874663929838356 -38.95481311326299, 55.91432937631534 -38.93684093328011, 55.95273445921667 -38.916312988792235, 55.98971472208132 -38.89331718360917, 56.02511180974637 -38.867951989299094, 56.058774146448194 -38.84032602351817, 56.09055758489309 -38.8105575848931, 56.12032602351817 -38.7787741464482, 56.14795198929909 -38.745111809746376, 56.173317183609164 -38.70971472208132, 56.19631298879223 -38.67273445921668, 56.2168409332801 -38.63432937631534, 56.23481311326299 -38.59466392983836, 56.25015256910705 -38.55390797331709, 56.262793614907416 -38.51223603001433, 56.27268211976528 -38.46982654558889, 56.27977573958473 -38.4268611239639, 56.284044098396656 -38.38352374967094, 56.285468918433345 -38.34, 56.45183614804168 -38.34))',
            wind_buffer_64:
              'POLYGON ((55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34, 55.62 -38.34))',
          },
          geometry: {
            type: 'Point',
            coordinates: [55.62, -38.34],
          },
          bbox: [55.62, -38.34, 55.62, -38.34],
        },
      ],
      bbox: [33.73, -38.34, 62.03, -11.18],
    };

    function filterTimeSerieByWindType(windTypes: string[]) {
      return timeSeries.features.filter(timePoint =>
        windTypes.includes(timePoint.properties.development),
      );
    }

    function loadImages() {
      const map = mapRef.getMap();
      // If the style's sprite does not already contain an image with ID 'cat',
      // add the image 'cat-icon.png' to the style's sprite with the ID 'cat'.
      map.loadImage(
        'public/images/anticipatory-action-storm/moderate-tropical-storm.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('moderate-tropical-storm')) {
            map.addImage('moderate-tropical-storm', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/severe-tropical-storm.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('severe-tropical-storm')) {
            map.addImage('severe-tropical-storm', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/tropical-cyclone.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('tropical-cyclone')) {
            map.addImage('tropical-cyclone', image!);
          }
        },
      );

      map.loadImage(
        'public/images/anticipatory-action-storm/overland.png',
        (error, image) => {
          if (error) {
            throw error;
          }
          if (!map.hasImage('overland')) {
            map.addImage('overland', image!);
          }
        },
      );
    }
    useEffect(() => {
      loadImages();
    }, []);
    return (
      <>
        {filterTimeSerieByWindType(['moderate tropical storm']).map(
          filteredTimeSerie => (
            <Source data={filteredTimeSerie} type="geojson">
              <Layer
                // beforeId={before}
                // id={layerId}
                type="symbol"
                layout={{ 'icon-image': ['image', 'moderate-tropical-storm'] }}
              />
            </Source>
          ),
        )}
        {filterTimeSerieByWindType(['severe tropical storm']).map(
          filteredTimeSerie => (
            <Source data={filteredTimeSerie} type="geojson">
              <Layer
                // beforeId={before}
                // id={layerId}
                type="symbol"
                layout={{ 'icon-image': ['image', 'severe-tropical-storm'] }}
              />
            </Source>
          ),
        )}
        {filterTimeSerieByWindType([
          'tropical cyclone',
          'intense tropical cyclone',
        ]).map(filteredTimeSerie => (
          <Source data={filteredTimeSerie} type="geojson">
            <Layer
              // beforeId={before}
              // id={layerId}
              type="symbol"
              layout={{ 'icon-image': ['image', 'tropical-cyclone'] }}
            />
          </Source>
        ))}

        {filterTimeSerieByWindType([
          // 'disturbance',
          // 'tropical disturbance',
          // 'tropical depression',
          'inland',
          // 'post-tropical depression',
          // 'extratropical system',
        ]).map(filteredTimeSerie => (
          <Source data={filteredTimeSerie} type="geojson">
            <Layer
              // beforeId={before}
              // id={layerId}
              type="symbol"
              layout={{ 'icon-image': ['image', 'overland'] }}
            />
          </Source>
        ))}
      </>
    );
  },
);
export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  mapRef: MapRef;
}

export default AnticipatoryActionStormLayer;
