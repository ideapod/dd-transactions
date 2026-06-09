import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#e3710a',
      dark: '#9d5b00',
      contrastText: '#fff',
    },
    text: {
      primary: '#3c4a60',
    },
    background: {
      default: '#f4f4f4',
    },
  },
  typography: {
    fontFamily: 'Verdana, Helvetica, sans-serif',
    fontSize: 16,
    button: { fontWeight: 700, textTransform: 'none' },
    h1: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.2, color: '#3c4a60' },
    h2: { fontWeight: 700, fontSize: '1.5rem',  lineHeight: 1.2, color: '#3c4a60' },
    h3: { fontWeight: 700, fontSize: '1.3rem',  lineHeight: 1.3, color: '#3c4a60' },
    h4: { fontWeight: 700, fontSize: '1.1rem',  lineHeight: 1.3, color: '#3c4a60' },
    h5: { fontWeight: 700, fontSize: '1rem',    lineHeight: 1.4, color: '#3c4a60' },
    h6: { fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, color: '#3c4a60' },
    body1: { fontSize: '0.875rem', lineHeight: 1.6, color: '#3c4a60' },
    body2: { fontSize: '0.8rem',   lineHeight: 1.5, color: '#3c4a60' },
  },
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
      styleOverrides: {
        root: {
          width: '100%',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          borderRadius: 2,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e3710a' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e3710a',
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: '#6b7280',
        },
      },
    },
    MuiInputLabel: {
      defaultProps: { shrink: true },
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#3c4a60',
          marginBottom: 4,
          '&.Mui-focused': { color: '#3c4a60' },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#3c4a60',
          fontWeight: 700,
          fontSize: '0.9rem',
          '&.Mui-focused': { color: '#3c4a60' },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          width: '100%',
          marginBottom: 8,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.8rem',
          marginLeft: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          padding: '10px 28px',
          fontSize: '1rem',
          fontWeight: 700,
        },
        containedPrimary: {
          backgroundColor: '#e3710a',
          '&:hover': { backgroundColor: '#9d5b00' },
        },
        outlinedPrimary: {
          borderColor: '#e3710a',
          color: '#e3710a',
          '&:hover': { borderColor: '#9d5b00', color: '#9d5b00', backgroundColor: 'transparent' },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: '#d1d5db',
          width: 32,
          height: 32,
          '&.Mui-active': { color: '#e3710a' },
          '&.Mui-completed': { color: '#e3710a' },
        },
        text: {
          fontFamily: 'Verdana, Helvetica, sans-serif',
          fontWeight: 700,
          fontSize: '0.75rem',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontFamily: 'Verdana, Helvetica, sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          color: '#6b7280',
          '&.Mui-active': { color: '#3c4a60', fontWeight: 700 },
          '&.Mui-completed': { color: '#3c4a60' },
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: '#d1d5db',
          borderTopWidth: 2,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          boxShadow: 'none',
          color: '#3c4a60',
          borderRadius: 0,
        },
        colorPrimary: {
          backgroundColor: '#fff',
          color: '#3c4a60',
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        variant: 'fullWidth',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          minHeight: 64,
          boxShadow: 'none',
          borderRadius: 0,
        },
        // Move the indicator to the top
        indicator: {
          backgroundColor: '#e3710a',
          height: 4,
          top: 0,
          bottom: 'auto',
        },
        flexContainer: {
          gap: 0,
          height: '100%',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          color: '#3c4a60',
          fontFamily: 'Verdana, Helvetica, sans-serif',
          fontWeight: 600,
          fontSize: '0.95rem',
          textTransform: 'none',
          minHeight: 64,
          padding: '16px 20px',
          borderRight: '1px solid #e5e7eb',
          borderTop: '4px solid transparent', // reserve space so content doesn't shift
          '&:last-of-type': { borderRight: 'none' },
          '&.Mui-selected': {
            color: '#e3710a',
            fontWeight: 700,
          },
          '&:hover:not(.Mui-selected)': {
            backgroundColor: '#fff8f3',
            color: '#9d5b00',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 2,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#6b7280',
          '&.Mui-checked': { color: '#e3710a' },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#6b7280',
          '&.Mui-checked': { color: '#e3710a' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
        },
      },
    },
  },
});

export default theme;
