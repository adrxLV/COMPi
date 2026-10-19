import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
export default function Editor({value,onChange}:{value:string;onChange:(value:string)=>void}){return <CodeMirror value={value} height="300px" extensions={[python()]} onChange={onChange} basicSetup={{lineNumbers:true,foldGutter:false}} aria-label="Python code editor"/>}
