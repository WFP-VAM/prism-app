import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { render } from '@testing-library/react';

import Boundaries from '.';

const Map = ReactMapboxGl({
  accessToken: 'TOKEN',
});

test('renders as expected', () => {
  const { container } = render(
    <Map
      // eslint-disable-next-line react/style-prop-object
      style="mapbox://styles/mapbox/light-v10"
      center={[90, 90]}
      zoom={[5]}
      containerStyle={{
        height: '100vh',
        width: '100vw',
      }}
    >
      <Boundaries />
    </Map>,
  );
  expect(container).toMatchSnapshot();
});
