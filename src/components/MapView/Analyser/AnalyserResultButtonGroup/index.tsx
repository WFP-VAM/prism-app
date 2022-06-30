import React from 'react';
import { useDispatch } from 'react-redux';
import { useSafeTranslation } from '../../../../i18n';
import AnalyserButton from '../AnalyserButton';
import {
  downloadCSVFromTableData,
  TabularAnalysisResult,
  useAnalysisTableColumns,
} from '../../../../utils/analysis-utils';
import { copyTextToClipboard } from '../../../../utils/url-utils';
import { addNotification } from '../../../../context/notificationStateSlice';
import AnalysisTable from '../AnalysisTable';

const AnalyserResult = ({
  isTableViewOpen,
  analysisResult,
  clearAnalysis,
  selectedDate,
}: AnalyserResultProps) => {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  const shareAnalysis = () => {
    copyTextToClipboard(window.location.href).then(() => {
      dispatch(
        addNotification({
          message: 'Link to this analysis copied to clipboard!',
          type: 'success',
        }),
      );
    });
  };

  return (
    <>
      {isTableViewOpen && (
        <AnalysisTable
          tableData={analysisResult.tableData}
          columns={translatedColumns}
        />
      )}
      <AnalyserButton
        label={t('Download')}
        onClick={() =>
          downloadCSVFromTableData(
            analysisResult,
            translatedColumns,
            selectedDate,
          )
        }
      />
      <AnalyserButton label={t('Clear Analysis')} onClick={clearAnalysis} />
      <AnalyserButton label={t('Share Analysis')} onClick={shareAnalysis} />
    </>
  );
};

interface AnalyserResultProps {
  isTableViewOpen: boolean;
  clearAnalysis: () => void;
  analysisResult: TabularAnalysisResult;
  selectedDate: number | null;
}

export default AnalyserResult;
