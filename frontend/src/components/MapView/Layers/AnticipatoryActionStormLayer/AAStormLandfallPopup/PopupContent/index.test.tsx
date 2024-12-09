import { render } from '@testing-library/react';
import PopupContent from '.';

describe('AAStormLandfallPopup component', () => {
  it('renders as expected', () => {
    const reportDate = '2024-03-01 18:00:00';
    const landfallInfo = {
      landfall_time: ['2024-03-12 00:00:00', '2024-03-12 06:00:00'],
      landfall_impact_district: 'Inhassoro',
      landfall_impact_intensity: [
        'severe tropical storm',
        'moderate tropical storm',
      ],
    };
    const { container } = render(
      <PopupContent reportDate={reportDate} landfallInfo={landfallInfo} />,
    );
    expect(container).toMatchSnapshot();
  });
});
