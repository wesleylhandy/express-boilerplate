export interface IUser {
    username: string;
    displayName?: string;
    profilePicUrl?: string;
    dateAdded: number;
    roles: Role[];
    id?: string;
    emails?: Email[];
    devices?: unknown[];
    verified: boolean;
    companyID?: string;
    password?: string;
}

export interface Role {
    role: string;
}

export interface Email {
    value: string;
    type: string;
}