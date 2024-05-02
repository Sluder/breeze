import { Order } from '@app/entities/Order';

export class Trade {

    private _uuid: string;
    private _orders: Order[];

    constructor() {
        this._uuid = 'test';
        this._orders = [];
    }

    public attachOrder(order: Order): void {
        this._orders.push(order);
    }

}