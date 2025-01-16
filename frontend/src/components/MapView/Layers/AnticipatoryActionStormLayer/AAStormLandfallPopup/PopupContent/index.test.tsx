import { render } from '@testing-library/react';

import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import PopupContent from '.';

describe('AAStormLandfallPopup component', () => {
  it('renders as expected', () => {
    const reportDate = '2024-03-01 18:00:00';
    const landfallInfo = {
      time: ['2024-03-12 01:00:00', '2024-03-12 06:00:00'],
      district: 'Inhassoro',
      severity: [AACategory.Severe, AACategory.Moderate],
    };

    const { container } = render(
      <PopupContent reportDate={reportDate} landfallInfo={landfallInfo} />,
    );
    expect(container).toMatchSnapshot();
  });
});
