import { Email, IUser, Role } from "./i-user";

const defaultRoles: Role[] = [{ role: "customer" }];

interface UserConstructor {
  username: string;
  displayName?: string;
  image?: { url?: string } & { [x: string]: unknown };
  id?: string;
  emails?: Email[];
  roles?: Role[];
  devices?: unknown[];
  companyID?: string;
}

export class User implements IUser {
  companyID?: string | undefined;
  devices?: unknown[] | undefined;
  displayName?: string | undefined;
  emails?: Email[] | undefined;
  password?: string | undefined;
  profilePicUrl?: string | undefined;

  username = '';
  dateAdded = Date.now();
  roles = defaultRoles;
  verified = false;
  
  constructor({
    username,
    displayName,
    image = { url: "" },
    id,
    emails,
    roles,
    devices,
    companyID,
  }: UserConstructor) {
    if (!(this instanceof User)) {
      return new User({
        username,
        displayName,
        image,
        id,
        emails,
        roles,
        devices,
        companyID,
      });
    }
    this.username = username;
    this.displayName = displayName;
    this.profilePicUrl = image?.url ?? "";
    this.roles = roles ?? this.roles;
    this.devices = devices;
    this.emails = emails;
    this.companyID = companyID;
  }
}

