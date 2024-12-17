import { DateRangeType } from 'config/types';

function AAStormTooltipContent({ date }: AAStormTooltipContentProps) {
  return (
    <>
      <p>hello</p>
      <p>{date.label}</p>
    </>
  );
}

interface AAStormTooltipContentProps {
  date: DateRangeType;
}
export default AAStormTooltipContent;
