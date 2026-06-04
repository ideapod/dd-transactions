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
  },
  typography: {
    fontFamily: 'Verdana, Helvetica, sans-serif',
    fontSize: 16,
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e3710a' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e3710a' },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#3c4a60',
          fontWeight: 600,
          '&.Mui-focused': { color: '#e3710a' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: { padding: '10px 24px' },
      },
    },
  },
});

export default theme;
