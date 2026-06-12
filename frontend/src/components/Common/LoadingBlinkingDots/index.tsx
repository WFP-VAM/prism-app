import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { memo } from 'react';

const blink = keyframes`
  50% {
    color: transparent;
  }
`;

const dotSx = (delay: string) => ({
  animation: `${blink} 1s infinite`,
  animationDelay: delay,
});

const LoadingBlinkingDots = memo(({ dotColor }: LoadingBlinkingDotsProps) => {
  const colorStyle = { color: dotColor || 'black' };
  return (
    <>
      &nbsp;
      <Box component="span" sx={dotSx('0ms')} style={colorStyle}>
        .
      </Box>
      <Box component="span" sx={dotSx('250ms')} style={colorStyle}>
        .
      </Box>
      <Box component="span" sx={dotSx('500ms')} style={colorStyle}>
        .
      </Box>
    </>
  );
});

export interface LoadingBlinkingDotsProps {
  dotColor?: string;
}

export default LoadingBlinkingDots;
