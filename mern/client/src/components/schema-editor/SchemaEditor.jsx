import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import VisualEditor from './VisualEditor';

export default function SchemaEditor({ schema, onChange }) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #e0e0e0', mb: 2 }}>
        <Tab label="Visual Editor" />
        <Tab label="JSON" />
      </Tabs>

      {tab === 0 && (
        <VisualEditor schema={schema} onChange={onChange} isActive={tab === 0} />
      )}

      {tab === 1 && (
        <CodeMirror
          value={schema ? JSON.stringify(schema, null, 2) : ''}
          height="550px"
          extensions={[json()]}
          onChange={(val) => {
            try { onChange(JSON.parse(val)); } catch {}
          }}
        />
      )}
    </Box>
  );
}
