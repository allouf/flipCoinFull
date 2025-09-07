Compiled with problems:
×
ERROR
[eslint] 
src\hooks\useAnchorProgram.ts
  Line 114:17:  Strings must use singlequote                                              @typescript-eslint/quotes
  Line 114:24:  Missing trailing comma                                                    @typescript-eslint/comma-dangle
  Line 115:10:  Missing trailing comma                                                    @typescript-eslint/comma-dangle
  Line 201:13:  Use object destructuring                                                  prefer-destructuring
  Line 201:13:  'connection' is already declared in the upper scope on line 84 column 11  @typescript-eslint/no-shadow
  Line 203:37:  Expected parentheses around arrow function argument                       arrow-parens
  Line 210:17:  Expected parentheses around arrow function argument                       arrow-parens
  Line 263:13:  Use object destructuring                                                  prefer-destructuring
  Line 263:13:  'connection' is already declared in the upper scope on line 84 column 11  @typescript-eslint/no-shadow
  Line 265:37:  Expected parentheses around arrow function argument                       arrow-parens
  Line 272:17:  Expected parentheses around arrow function argument                       arrow-parens
  Line 321:13:  Use object destructuring                                                  prefer-destructuring
  Line 321:13:  'connection' is already declared in the upper scope on line 84 column 11  @typescript-eslint/no-shadow
  Line 323:37:  Expected parentheses around arrow function argument                       arrow-parens
  Line 330:17:  Expected parentheses around arrow function argument                       arrow-parens
  Line 354:13:  Use object destructuring                                                  prefer-destructuring
  Line 354:13:  'connection' is already declared in the upper scope on line 84 column 11  @typescript-eslint/no-shadow
  Line 356:38:  Expected parentheses around arrow function argument                       arrow-parens
  Line 363:17:  Expected parentheses around arrow function argument                       arrow-parens
  Line 364:1:   Trailing spaces not allowed                                               no-trailing-spaces

Search for the keywords to learn more about each error.
ERROR in src/components/HistoryTable.tsx:221:5
TS2322: Type 'AccessorKeyColumnDef<GameHistoryRecord, Date>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
  Type 'AccessorKeyColumnDefBase<GameHistoryRecord, Date> & Partial<StringHeaderIdentifier>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
    Type 'AccessorKeyColumnDefBase<GameHistoryRecord, Date> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown> & Partial<IdIdentifier<GameHistoryRecord, unknown>>'.
      Type 'AccessorKeyColumnDefBase<GameHistoryRecord, Date> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown>'.
        Types of property 'footer' are incompatible.
          Type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, Date>> | undefined' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
            Type '(props: HeaderContext<GameHistoryRecord, Date>) => any' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
              Type '(props: HeaderContext<GameHistoryRecord, Date>) => any' is not assignable to type '(props: HeaderContext<GameHistoryRecord, unknown>) => any'.
                Types of parameters 'props' and 'props' are incompatible.
                  Type 'HeaderContext<GameHistoryRecord, unknown>' is not assignable to type 'HeaderContext<GameHistoryRecord, Date>'.
                    The types of 'column.accessorFn' are incompatible between these types.
                      Type 'AccessorFn<GameHistoryRecord, unknown> | undefined' is not assignable to type 'AccessorFn<GameHistoryRecord, Date> | undefined'.
                        Type 'AccessorFn<GameHistoryRecord, unknown>' is not assignable to type 'AccessorFn<GameHistoryRecord, Date>'.
                          Type 'unknown' is not assignable to type 'Date'.
    219 |
    220 |     // Date column
  > 221 |     columnHelper.accessor('timestamp', {
        |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 222 |       header: 'Date',
        | ^^^^^^^^^^^^^^^^^^^^^
  > 223 |       id: 'timestamp',
        | ^^^^^^^^^^^^^^^^^^^^^
  > 224 |       size: 120,
        | ^^^^^^^^^^^^^^^^^^^^^
  > 225 |       cell: (info) => {
        | ^^^^^^^^^^^^^^^^^^^^^
  > 226 |         const date = info.getValue() as Date;
        | ^^^^^^^^^^^^^^^^^^^^^
  > 227 |         return (
        | ^^^^^^^^^^^^^^^^^^^^^
  > 228 |           <div className="text-sm">
        | ^^^^^^^^^^^^^^^^^^^^^
  > 229 |             <div className="font-medium text-gray-900 dark:text-white">
        | ^^^^^^^^^^^^^^^^^^^^^
  > 230 |               {format(date, 'MMM dd')}
        | ^^^^^^^^^^^^^^^^^^^^^
  > 231 |             </div>
        | ^^^^^^^^^^^^^^^^^^^^^
  > 232 |             <div className="text-gray-500 dark:text-gray-400">
        | ^^^^^^^^^^^^^^^^^^^^^
  > 233 |               {format(date, 'HH:mm')}
        | ^^^^^^^^^^^^^^^^^^^^^
  > 234 |             </div>
        | ^^^^^^^^^^^^^^^^^^^^^
  > 235 |           </div>
        | ^^^^^^^^^^^^^^^^^^^^^
  > 236 |         );
        | ^^^^^^^^^^^^^^^^^^^^^
  > 237 |       },
        | ^^^^^^^^^^^^^^^^^^^^^
  > 238 |       sortingFn: 'datetime',
        | ^^^^^^^^^^^^^^^^^^^^^
  > 239 |     }),
        | ^^^^^^^
    240 |
    241 |     // Opponent column
    242 |     columnHelper.display({
ERROR in src/components/HistoryTable.tsx:260:5
TS2322: Type 'AccessorKeyColumnDef<GameHistoryRecord, number>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
  Type 'AccessorKeyColumnDefBase<GameHistoryRecord, number> & Partial<StringHeaderIdentifier>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
    Type 'AccessorKeyColumnDefBase<GameHistoryRecord, number> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown> & Partial<IdIdentifier<GameHistoryRecord, unknown>>'.
      Type 'AccessorKeyColumnDefBase<GameHistoryRecord, number> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown>'.
        Types of property 'footer' are incompatible.
          Type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, number>> | undefined' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
            Type '(props: HeaderContext<GameHistoryRecord, number>) => any' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
              Type '(props: HeaderContext<GameHistoryRecord, number>) => any' is not assignable to type '(props: HeaderContext<GameHistoryRecord, unknown>) => any'.
                Types of parameters 'props' and 'props' are incompatible.
                  Type 'HeaderContext<GameHistoryRecord, unknown>' is not assignable to type 'HeaderContext<GameHistoryRecord, number>'.
                    The types of 'column.accessorFn' are incompatible between these types.
                      Type 'AccessorFn<GameHistoryRecord, unknown> | undefined' is not assignable to type 'AccessorFn<GameHistoryRecord, number> | undefined'.
                        Type 'AccessorFn<GameHistoryRecord, unknown>' is not assignable to type 'AccessorFn<GameHistoryRecord, number>'.
                          Type 'unknown' is not assignable to type 'number'.
    258 |
    259 |     // Bet Amount column
  > 260 |     columnHelper.accessor('betAmount', {
        |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 261 |       header: 'Bet Amount',
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 262 |       id: 'betAmount',
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 263 |       size: 100,
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 264 |       cell: (info) => {
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 265 |         const game = info.row.original;
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 266 |         return (
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 267 |           <TokenAmount
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 268 |             amount={info.getValue() as number}
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 269 |             token={game.token}
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 270 |             className="text-sm font-medium text-gray-900 dark:text-white"
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 271 |           />
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 272 |         );
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 273 |       },
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 274 |     }),
        | ^^^^^^^
    275 |
    276 |     // User's Choice column
    277 |     columnHelper.display({
ERROR in src/components/HistoryTable.tsx:293:5
TS2322: Type 'AccessorKeyColumnDef<GameHistoryRecord, "heads" | "tails">' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
  Type 'AccessorKeyColumnDefBase<GameHistoryRecord, "heads" | "tails"> & Partial<StringHeaderIdentifier>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
    Type 'AccessorKeyColumnDefBase<GameHistoryRecord, "heads" | "tails"> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown> & Partial<IdIdentifier<GameHistoryRecord, unknown>>'.
      Type 'AccessorKeyColumnDefBase<GameHistoryRecord, "heads" | "tails"> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown>'.
        Types of property 'footer' are incompatible.
          Type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, "heads" | "tails">> | undefined' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
            Type '(props: HeaderContext<GameHistoryRecord, "heads" | "tails">) => any' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
              Type '(props: HeaderContext<GameHistoryRecord, "heads" | "tails">) => any' is not assignable to type '(props: HeaderContext<GameHistoryRecord, unknown>) => any'.
                Types of parameters 'props' and 'props' are incompatible.
                  Type 'HeaderContext<GameHistoryRecord, unknown>' is not assignable to type 'HeaderContext<GameHistoryRecord, "heads" | "tails">'.
                    The types of 'column.accessorFn' are incompatible between these types.
                      Type 'AccessorFn<GameHistoryRecord, unknown> | undefined' is not assignable to type 'AccessorFn<GameHistoryRecord, "heads" | "tails"> | undefined'.
                        Type 'AccessorFn<GameHistoryRecord, unknown>' is not assignable to type 'AccessorFn<GameHistoryRecord, "heads" | "tails">'.
                          Type 'unknown' is not assignable to type '"heads" | "tails"'.
    291 |
    292 |     // Result column
  > 293 |     columnHelper.accessor('result', {
        |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 294 |       header: 'Result',
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 295 |       id: 'result',
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 296 |       size: 80,
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 297 |       cell: (info) => (
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 298 |         <div className="text-sm capitalize font-medium text-gray-900 dark:text-white">
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 299 |           {String(info.getValue())}
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 300 |         </div>
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 301 |       ),
        | ^^^^^^^^^^^^^^^^^^^^^^^
  > 302 |     }),
        | ^^^^^^^
    303 |
    304 |     // Outcome column
    305 |     columnHelper.display({
ERROR in src/components/HistoryTable.tsx:349:5
TS2322: Type 'AccessorKeyColumnDef<GameHistoryRecord, string>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
  Type 'AccessorKeyColumnDefBase<GameHistoryRecord, string> & Partial<StringHeaderIdentifier>' is not assignable to type 'ColumnDef<GameHistoryRecord, unknown>'.
    Type 'AccessorKeyColumnDefBase<GameHistoryRecord, string> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown> & Partial<IdIdentifier<GameHistoryRecord, unknown>>'.
      Type 'AccessorKeyColumnDefBase<GameHistoryRecord, string> & Partial<StringHeaderIdentifier>' is not assignable to type 'AccessorKeyColumnDefBase<GameHistoryRecord, unknown>'.
        Types of property 'footer' are incompatible.
          Type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, string>> | undefined' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
            Type '(props: HeaderContext<GameHistoryRecord, string>) => any' is not assignable to type 'ColumnDefTemplate<HeaderContext<GameHistoryRecord, unknown>> | undefined'.
              Type '(props: HeaderContext<GameHistoryRecord, string>) => any' is not assignable to type '(props: HeaderContext<GameHistoryRecord, unknown>) => any'.
                Types of parameters 'props' and 'props' are incompatible.
                  Type 'HeaderContext<GameHistoryRecord, unknown>' is not assignable to type 'HeaderContext<GameHistoryRecord, string>'.
                    The types of 'column.accessorFn' are incompatible between these types.
                      Type 'AccessorFn<GameHistoryRecord, unknown> | undefined' is not assignable to type 'AccessorFn<GameHistoryRecord, string> | undefined'.
                        Type 'AccessorFn<GameHistoryRecord, unknown>' is not assignable to type 'AccessorFn<GameHistoryRecord, string>'.
                          Type 'unknown' is not assignable to type 'string'.
    347 |
    348 |     // Transaction column
  > 349 |     columnHelper.accessor('signature', {
        |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 350 |       header: 'Transaction',
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 351 |       id: 'transaction',
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 352 |       size: 120,
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 353 |       cell: (info) => (
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 354 |         <ExplorerLink
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 355 |           signature={info.getValue() as string}
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 356 |           className="text-sm"
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 357 |           showFullSignature={false}
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 358 |         />
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 359 |       ),
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 360 |     }),
        | ^^^^^^^
    361 |   ], [userAddress, expandedRows]);
    362 |
    363 |   const table = useReactTable({
ERROR in src/hooks/useAnchorProgram.ts:107:24
TS2352: Conversion of type '{ address: string; metadata: { name: string; version: string; spec: string; address: string; }; version: string; name: string; instructions: ({ name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { ...; }[]; } | { ...; } | { ...; })[]; accounts: { ...; }[]; types: { ...; }[]; errors...' to type 'Idl' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'instructions' are incompatible.
    Type '({ name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { name: string; type: string; }[]; } | { name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { ...; }[]; } | { ...; })[]' is not comparable to type 'IdlInstruction[]'.
      Type '{ name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { name: string; type: string; }[]; } | { name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { ...; }[]; } | { ...; }' is not comparable to type 'IdlInstruction'.
        Property 'discriminator' is missing in type '{ name: string; accounts: { name: string; isMut: boolean; isSigner: boolean; }[]; args: { name: string; type: { array: (string | number)[]; }; }[]; }' but required in type 'IdlInstruction'.
    105 |
    106 |       // Create a properly typed IDL with address property
  > 107 |       const typedIdl = {
        |                        ^
  > 108 |         ...idl,
        | ^^^^^^^^^^^^^^^
  > 109 |         address: PROGRAM_ID.toString(),
        | ^^^^^^^^^^^^^^^
  > 110 |         metadata: {
        | ^^^^^^^^^^^^^^^
  > 111 |           ...idl.metadata,
        | ^^^^^^^^^^^^^^^
  > 112 |           name: idl.name,
        | ^^^^^^^^^^^^^^^
  > 113 |           version: idl.version,
        | ^^^^^^^^^^^^^^^
  > 114 |           spec: "0.1.0"
        | ^^^^^^^^^^^^^^^
  > 115 |         }
        | ^^^^^^^^^^^^^^^
  > 116 |       } as Idl;
        | ^^^^^^^^^^^^^^^
    117 |
    118 |       const programInstance = new Program(
    119 |         typedIdl,
ERROR in src/hooks/useVRFAnchorProgram.ts:217:15
TS2352: Conversion of type 'void | undefined' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'void' is not comparable to type 'string'.
    215 |         
    216 |         return {
  > 217 |           tx: result.result as string,
        |               ^^^^^^^^^^^^^^^^^^^^^^^
    218 |           vrfStats: {
    219 |             attempts: result.attempts,
    220 |             totalDuration: result.totalDuration,