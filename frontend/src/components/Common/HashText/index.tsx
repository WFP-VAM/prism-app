// This component creates a hidden link, to the version in which the app was built.
import React from 'react';

const HashText = () => {
  const hash = process.env.REACT_APP_GIT_HASH;
  if (hash) {
    // eslint-disable-next-line no-console
    console.info(`The application is running version #${hash}`);
    // eslint-disable-next-line no-console
    console.info(`https://github.com/WFP-VAM/prism-app/tree/${hash}`);
  }
  return (
    <a
      style={{
        color: '#f5f7f8',
        fontSize: '0.7rem',
        left: '1rem',
      }}
      target="_blank"
      rel="noopener noreferrer"
      href={
        hash
          ? `https://github.com/WFP-VAM/prism-app/tree/${hash}`
          : 'https://github.com/WFP-VAM/prism-app'
      }
    >
      version hash: {hash}
    </a>
  );
};

export default HashText;
