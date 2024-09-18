import React, { useEffect, useState } from 'react';
import * as g from "@giraffechain/giraffe-sdk";
import GridComponent from './GridComponent';

const GiraffeComponent = () => {
    const [client, setClient] = useState<g.GiraffeClient | undefined>(undefined);

    useEffect(() => {
        const initGiraffe = async () => {
            const v = new g.RpcGiraffeClient("https://testnet.giraffechain.com/api");
            setClient(v);
        };

        initGiraffe();
    }, [setClient]);

    return (
        <div>
            {client ? <GridComponent client={client} /> : "Initializing"}
        </div>
    );
};

export default GiraffeComponent;
