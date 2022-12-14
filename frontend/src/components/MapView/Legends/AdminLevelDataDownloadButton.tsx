import { mapValues } from 'lodash';
import moment from 'moment';
import React from 'react';
import { useSelector } from 'react-redux';
import { AdminLevelDataLayerProps } from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import {
  dateRangeSelector,
  layerDataSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { castObjectsArrayToCsv } from '../../../utils/csv-utils';
import { DEFAULT_DATE_FORMAT_SNAKE_CASE } from '../../../utils/name-utils';
import MultiOptionsButton from '../../Common/MultiOptionsButton';
import { downloadToFile } from '../utils';

interface IProps {
  layer: AdminLevelDataLayerProps;
}

function AdminLevelDataDownloadButton({ layer }: IProps) {
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const adminLevelLayerData = useSelector(
    layerDataSelector(layer.id, selectedDate),
  ) as LayerData<AdminLevelDataLayerProps>;

  const { t } = useSafeTranslation();

  const getFilename = (): string => {
    const safeTitle = layer.title ?? layer.id;
    if (selectedDate && layer.dates) {
      const dateString = moment(selectedDate).format(
        DEFAULT_DATE_FORMAT_SNAKE_CASE,
      );
      return `${safeTitle}_${dateString}`;
    }
    return safeTitle;
  };

  const handleDownloadGeoJson = (): void => {
    downloadToFile(
      {
        content: JSON.stringify(adminLevelLayerData.data.features),
        isUrl: false,
      },
      getFilename(),
      'application/json',
    );
  };

  const handleDownloadCsv = (): void => {
    const translatedColumnsNames = mapValues(
      adminLevelLayerData.data.layerData[0],
      (v, k) => (k === 'value' ? t(adminLevelLayerData.layer.id) : t(k)),
    );
    downloadToFile(
      {
        content: castObjectsArrayToCsv(
          adminLevelLayerData.data.layerData,
          translatedColumnsNames,
          ';',
        ),
        isUrl: false,
      },
      getFilename(),
      'text/csv',
    );
  };

  return (
    <MultiOptionsButton
      mainLabel={t('Download')}
      options={[
        {
          label: 'GEOJSON',
          onClick: handleDownloadGeoJson,
        },
        {
          label: 'CSV',
          onClick: handleDownloadCsv,
        },
      ]}
    />
  );
}

export default AdminLevelDataDownloadButton;
