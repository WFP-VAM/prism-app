import { Box, Typography } from '@mui/material';
import { DateRangeType } from 'config/types';
import { format } from 'date-fns';
import { locales } from 'i18n';
import { DateFormat } from 'utils/name-utils';

import {
  dateItemLabelSx,
  dayItemSx,
  TIMELINE_DAY_ITEM_CLASS,
} from '../timelineItemsStyles';

function TimelineLabel({
  locale,
  date,
  showDraggingCursor,
}: TimelineLabelProps) {
  if (date.isFirstDay) {
    return (
      <Typography
        variant="body2"
        sx={dateItemLabelSx}
        style={{ cursor: showDraggingCursor ? 'ew-resize' : 'default' }}
        // prevent click on the label from triggering the date selection
        onClick={e => e.stopPropagation()}
      >
        {format(
          date.value,
          date.month.includes('Jan')
            ? DateFormat.ShortMonthYear
            : DateFormat.ShortMonth,
          {
            locale: locales[locale as keyof typeof locales],
          },
        )}
      </Typography>
    );
  }
  return (
    <Box
      className={TIMELINE_DAY_ITEM_CLASS}
      sx={dayItemSx}
      role="presentation"
    />
  );
}

export interface TimelineLabelProps {
  locale: string;
  date: DateRangeType;
  showDraggingCursor: boolean;
}

export default TimelineLabel;
