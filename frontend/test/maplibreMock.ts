const LngLatBounds = jest.fn().mockImplementation(() => ({
  extend: jest.fn().mockReturnThis(),
  getWest: jest.fn(() => 0),
  getEast: jest.fn(() => 0),
  getSouth: jest.fn(() => 0),
  getNorth: jest.fn(() => 0),
}));

export { LngLatBounds };
export const addProtocol = jest.fn();
export const removeProtocol = jest.fn();
export const setWorkerUrl = jest.fn();
export const Map = jest.fn();
export const ScaleControl = jest.fn();

export default {
  addProtocol,
  removeProtocol,
  setWorkerUrl,
  Map,
  LngLatBounds,
  ScaleControl,
};
