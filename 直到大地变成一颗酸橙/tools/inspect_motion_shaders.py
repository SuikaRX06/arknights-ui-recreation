"""Read-only inspection of the installed native motion shaders using D3DDisassemble."""
import ctypes, json, sys
from pathlib import Path
sys.path[:0] = [str(Path(__file__).parent), str(Path(__file__).parent / 'python-deps')]
import UnityPy
from UnityPy.helpers import CompressionHelper
from UnityPy.enums.BundleFile import CompressionFlags
from UnityPy.streams import EndianBinaryReader
from UnityPy.export.ShaderConverter import ShaderProgram
from vendor.lz4ak.Block import decompress_lz4ak
CompressionHelper.DECOMPRESSION_MAP[CompressionFlags.LZHAM] = decompress_lz4ak
source = Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data\StreamingAssets\AB\Windows\[uc]shaders.ab')
out = Path('reference/extracted/motion-shaders'); out.mkdir(exist_ok=True)
dll = ctypes.WinDLL('d3dcompiler_47.dll')
disassemble = dll.D3DDisassemble
disassemble.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_char_p, ctypes.POINTER(ctypes.c_void_p)]
disassemble.restype = ctypes.c_long
ids = {-236171590878140089, 2389124941390258021}
inventory = json.loads(Path('reference/extracted/act53side-home/inventory.json').read_text('utf8'))
for row in inventory:
    if row['type'] == 'Material' and row['name'] in ['particle_line', 'm_deco_line_1', 'm_deco_line_2']:
        mat = json.loads((Path('reference/extracted/act53side-home') / row['file']).read_text('utf8'))
        ids.add(mat['m_Shader']['m_PathID'])
for obj in UnityPy.load(str(source)).objects:
    if obj.path_id not in ids: continue
    shader = obj.read()
    (out / f'{obj.path_id}.properties.txt').write_text(shader.export(), encoding='utf8')
    (out / f'{obj.path_id}.bindings.json').write_text(json.dumps(obj.parse_as_dict()['m_ParsedForm'], ensure_ascii=False, indent=2), encoding='utf8')
    blob = bytes(shader.compressedBlob)
    raw = CompressionHelper.decompress_lz4(blob, shader.decompressedLengths[0][0])
    program = ShaderProgram(EndianBinaryReader(raw, endian='<'), obj.version)
    count = 0
    for i, sub in enumerate(program.m_SubPrograms):
        code = bytes(sub.m_ProgramCode); start = code.find(b'DXBC')
        if start < 0: continue
        code = code[start:]
        length = int.from_bytes(code[24:28], 'little')
        code = code[:length]; result = ctypes.c_void_p()
        status = disassemble(code, len(code), 0, None, ctypes.byref(result))
        if status < 0:
            print('Skipped non-program header', i, status); continue
        vtable = ctypes.cast(result, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
        pointer = ctypes.WINFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p)(vtable[3])(result)
        size = ctypes.WINFUNCTYPE(ctypes.c_size_t, ctypes.c_void_p)(vtable[4])(result)
        text = ctypes.string_at(pointer, size).rstrip(b'\x00').decode('utf8')
        ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)(vtable[2])(result)
        (out / f'{obj.path_id}.{i}.asm.txt').write_text(text, encoding='utf8'); count += 1
    print(shader.m_ParsedForm.m_Name, count, 'programs')
