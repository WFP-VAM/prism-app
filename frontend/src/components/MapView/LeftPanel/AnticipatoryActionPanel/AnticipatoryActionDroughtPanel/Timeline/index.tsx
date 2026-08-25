import { Equalizer, Reply } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAAFilters,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAView,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { useSafeTranslation } from 'i18n';
import { useDispatch, useSelector } from 'react-redux';

import {
  aaCommonSx,
  aaTimelineItemSx,
  aaTimelineSx,
} from '../../aaPanelStyles';
import { dateSorter } from '../DistrictView/utils';
import { getAAColor, getAAIcon } from '../utils';
import { timelineTransform } from './utils';

interface TimelineItemProps {
  item: AnticipatoryActionDataRow;
}

function TimelineItem({ item }: TimelineItemProps) {
  const { t } = useSafeTranslation();

  const color = getAAColor(item.category, item.isValid ? item.phase : 'na');

  // Calculate font size based on character count
  const calculateFontSize = (text: string) => {
    const baseSize = 0.8; // rem
    const minSize = 0.2; // rem
    const charCount = text.length;
    return Math.max(baseSize - (charCount - 6) * 0.05, minSize);
  };

  const fontSize = calculateFontSize(item.index);

  return (
    <Box sx={aaTimelineItemSx.wrapper} style={{ border: `1px solid ${color}` }}>
      <Typography variant="h3">{item.probability}</Typography>
      <Typography>
        {t('trig.')} {item.trigger}
      </Typography>
      <Box
        sx={aaTimelineItemSx.probabilityBar}
        style={{
          backgroundColor: color,
          width: `${item.probability * 100}%`,
        }}
      />
      <Box
        sx={aaTimelineItemSx.triggerBar}
        style={{
          width: `${item.trigger * 100}%`,
        }}
      />
      <Typography
        sx={aaTimelineItemSx.indexText}
        style={{
          fontSize: `${fontSize}rem`,
        }}
      >
        {item.index}
      </Typography>
    </Box>
  );
}

interface TimelineProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function Timeline({ dialogs }: TimelineProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const AAData = useSelector(AADataSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const AAFilters = useSelector(AAFiltersSelector);

  const timelineButtons = [
    {
      icon: Reply,
      text: 'Back',
      onClick: () => {
        dispatch(setAAFilters({ selectedIndex: '' }));
        dispatch(setAAView(AAView.District));
      },
    },
    {
      icon: Equalizer,
      text: 'Forecast',
      onClick: () => {
        dispatch(setAAFilters({ selectedIndex: '' }));
        dispatch(setAAView(AAView.Forecast));
      },
    },
  ];

  const { windowData, allRows } = timelineTransform({
    filters: AAFilters,
    data: AAData,
    selectedDistrict,
  });

  return (
    <>
      <Box sx={aaTimelineSx.root}>
        {Object.entries(windowData).map(([win, winData]) => {
          if (!winData || Object.keys(winData.rows).length === 0) {
            return (
              <Box key={win} sx={aaTimelineSx.windowWrapper}>
                {t('No Data')}{' '}
              </Box>
            );
          }
          const { months, rows } = winData;

          return (
            <Box key={win} sx={aaTimelineSx.windowWrapper}>
              <Typography variant="h4" sx={aaCommonSx.windowHeader}>
                {t(win)}
              </Typography>
              <Box sx={aaTimelineSx.tableWrapper}>
                <Box sx={aaTimelineSx.headRowWrapper}>
                  <Box sx={aaTimelineSx.iconColumn} />
                  {months.map(([date, label]) => (
                    <Box key={date} sx={aaTimelineSx.headColumn}>
                      <Typography sx={aaTimelineSx.monthText}>
                        {t(label)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {Object.entries({ ...allRows, ...rows })
                  .sort(dateSorter)
                  .map(([rowId, rowData]) => (
                    <Box key={rowId} sx={aaTimelineSx.rowWrapper}>
                      <Box sx={aaTimelineSx.iconColumn}>
                        {getAAIcon(
                          rowData.status.category,
                          rowData.status.phase,
                        )}
                      </Box>
                      {months.map(([date, _label]) => {
                        const elem = rowData.data.find(z => z.date === date);
                        if (!elem) {
                          return <Box key={date} sx={aaTimelineSx.column} />;
                        }
                        return (
                          <Box key={date} sx={aaTimelineSx.column}>
                            <TimelineItem item={elem} />
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={aaCommonSx.footerWrapperVert}>
        <Box sx={aaCommonSx.footerActionsWrapper}>
          {timelineButtons.map(x => (
            <Button
              key={x.text}
              sx={aaCommonSx.footerButton}
              variant="outlined"
              fullWidth
              onClick={x.onClick}
              startIcon={<x.icon />}
            >
              <Typography>{t(x.text)}</Typography>
            </Button>
          ))}
        </Box>
        <Box sx={aaCommonSx.footerDialogsWrapperVert}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              sx={aaCommonSx.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </Box>
      </Box>
    </>
  );
}

export default Timeline;
