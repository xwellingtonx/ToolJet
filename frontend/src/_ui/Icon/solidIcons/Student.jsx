import React from 'react';

const Student = ({ fill = '#C1C8CD', width = '21', className = '', viewBox = '0 0 21 21' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={width} height={width} viewBox="0 0 14 17" fill="none">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12.4167 8.08333V3.5H13.6667V8.08333C13.6667 8.42851 13.3868 8.70833 13.0417 8.70833C12.6965 8.70833 12.4167 8.42851 12.4167 8.08333Z"
      fill={fill}
    />
    <path
      d="M10.3333 6.83337V4.33337H3.66666V6.83337C3.66666 8.67432 5.15904 10.1667 6.99999 10.1667C8.84094 10.1667 10.3333 8.67432 10.3333 6.83337Z"
      fill={fill}
    />
    <path
      d="M0.356695 3.11925L5.98465 0.617937C6.63106 0.330642 7.36893 0.330642 8.01534 0.617937L13.6433 3.11925C13.9732 3.26588 13.9732 3.73413 13.6433 3.88076L8.01534 6.38207C7.36893 6.66937 6.63106 6.66937 5.98465 6.38207L0.356695 3.88076C0.0267722 3.73413 0.0267722 3.26588 0.356695 3.11925Z"
      fill={fill}
    />
    <path
      d="M8.91627 11.333L7.5925 12.6716C7.26633 13.0014 6.73363 13.0014 6.40746 12.6716L5.08369 11.333C4.87919 11.1262 4.58065 11.0381 4.30164 11.1202C1.96403 11.8076 0.333313 13.3608 0.333313 15.1667C0.333313 16.0872 1.07951 16.8334 1.99998 16.8334H12C12.9205 16.8334 13.6666 16.0872 13.6666 15.1667C13.6666 13.3608 12.0359 11.8076 9.69832 11.1202C9.41931 11.0381 9.12077 11.1262 8.91627 11.333Z"
      fill={fill}
    />
  </svg>
);

export default Student;