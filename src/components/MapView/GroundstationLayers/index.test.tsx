import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { Map } from 'immutable';
import { render } from '@testing-library/react';

import GroundstationLayers from '.';

const ReactMap = ReactMapboxGl({
  accessToken: 'TOKEN',
});

test('renders as expected', () => {
  const { container } = render(
    <ReactMap
      // eslint-disable-next-line react/style-prop-object
      style="mapbox://styles/mapbox/light-v10"
      center={[90, 90]}
      zoom={[5]}
      containerStyle={{
        height: '100vh',
        width: '100vw',
      }}
    >
      <GroundstationLayers layers={Map()} />
    </ReactMap>,
  );
  expect(container).toMatchSnapshot();
});
