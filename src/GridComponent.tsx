import React, { useState, useEffect } from 'react';
import './GiraffeComponent.css';
import * as g from "@giraffechain/giraffe-sdk";
import { SketchPicker } from 'react-color';

const GridComponent = ({ client }: { client: g.GiraffeClient }) => {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContent>({ row: 0, col: 0, data: undefined });
    const [desiredColor, setDesiredColor] = useState("#ffffff");

    const handleClick = (row: number, col: number, data: CellData | undefined) => {
        setModalContent({ row, col, data });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const createDefaultGrid = () => {
        const r = [];

        for (let row = 0; row < gridSize; row++) {
            const cells = [];
            for (let col = 0; col < gridSize; col++) {
                cells.push(
                    <div
                        key={`${row}-${col}`}
                        className="cell"
                        onClick={() => handleClick(row, col, undefined)}
                    ></div>
                );
            }
            r.push(<div key={row} className="row">{cells}</div>);
        }
        return r;
    };

    const [grid, setGrid] = useState(createDefaultGrid);

    useEffect(() => {
        const updateGrid = async () => {
            const data = await fetchGrid(client);
            const r = [];

            for (let row = 0; row < gridSize; row++) {
                const cells = [];
                for (let col = 0; col < gridSize; col++) {
                    const cell = data[row][col];
                    cells.push(
                        <div
                            key={`${row}-${col}`}
                            style={{ backgroundColor: cell?.color }}
                            className={`cell ${cell ? 'cell-filled' : ''}`}
                            onClick={() => handleClick(row, col, cell)}
                        ></div>
                    );
                }
                r.push(<div key={row} className="row">{cells}</div>);
            }
            setGrid(r);
        };

        updateGrid();
    }, [client, setGrid]);

    function submit(content: ModalContent, color: string) {
        return async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!color) return;
            const x = content.col.toString();
            const y = content.row.toString();
            const quantity = content.data ? content.data.quantity + 1 : 1;
            const output = g.TransactionOutput.fromJSON({
                value: {
                    quantity: quantity + 1,
                    graphEntry: {
                        vertex: {
                            label: "a-small-plot-of-land",
                            data: { x, y, color }
                        }
                    }
                }
            });
            const tx: g.Transaction = g.Transaction.fromJSON({ outputs: [output] });
            const url = g.getWalletTransferUrl(tx, "https://testnet.giraffechain.com/#");
            window.open(url, "_blank");
            setIsModalOpen(false);
        };
    }

    return (
        <div className="wrapper">
            <div className="grid">
                {grid}
            </div>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={closeModal}>&times;</span>
                        <p>{modalContent.row} x {modalContent.col}</p>
                        <form onSubmit={submit(modalContent, desiredColor)}>
                            <div className="modal-color-picker">
                                <SketchPicker color={desiredColor} onChangeComplete={(color) => setDesiredColor(color.hex)} />
                            </div>
                            <button type="submit">Submit</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GridComponent;

async function fetchGrid(client: g.GiraffeClient): Promise<GridData> {
    const references = await client.queryVertices("a-small-plot-of-land", []);
    const data: GridData = [];
    for (let row = 0; row < gridSize; row++) {
        const cells = [];
        for (let col = 0; col < gridSize; col++) {
            cells.push(undefined);
        }
        data.push(cells);
    }

    const handleOutput = async (reference: g.TransactionOutputReference) => {
        const output = await client.getTransactionOutputOpt(reference);
        if (!output) {
            console.log(`Missing output ${JSON.stringify(reference)}`);
            return;
        }
        const vertex = output.value?.graphEntry?.vertex;
        if (!vertex) {
            console.log(`Missing vertex ${JSON.stringify(output)}`);
            return;
        }
        if (!vertex.data) {
            console.log(`Missing vertex data ${JSON.stringify(vertex)}`);
            return;
        }
        const x = parseInt(vertex.data["x"], 10);
        if (!x) {
            console.log(`Missing x ${JSON.stringify(vertex.data)}`);
            return;
        }
        const y = parseInt(vertex.data["y"], 10);
        if (!y) {
            console.log(`Missing y ${JSON.stringify(vertex.data)}`);
            return;
        }
        const current = data[y][x];
        if (!current || current.quantity < output.value!.quantity) {
            const color = vertex.data["color"];
            if (!color) {
                console.log(`Missing color ${JSON.stringify(vertex.data)}`);
                return;
            }
            console.log("Setting cell", x, y, color, output.value!.quantity);
            data[y][x] = {
                color: color,
                quantity: output.value!.quantity
            };
        }
    }

    await Promise.all(references.map(handleOutput));
    return data;
}

const gridSize = 32;

type GridData = (CellData | undefined)[][];

interface CellData {
    color: string;
    quantity: number;
}

interface ModalContent {
    row: number;
    col: number;
    data: CellData | undefined;
}