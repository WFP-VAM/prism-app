import React from 'react';

const HashText = () => {
  const hash = process.env.REACT_APP_GIT_HASH;
  return (
    <p
      style={{
        color: '#f5f7f8',
        position: 'absolute',
        bottom: '0',
        fontSize: '0.7rem',
        left: '1rem',
      }}
    >
      version hash:{' '}
      {hash && (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://github.com/WFP-VAM/prism-app/tree/${hash}`}
        >
          {hash}
        </a>
      )}
    </p>
  );
};

export default HashText;
