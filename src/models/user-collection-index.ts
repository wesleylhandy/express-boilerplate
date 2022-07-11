import { IndexDescription } from "mongodb";

export const userIndices: IndexDescription[] = [{
    key: {
      "roles.role": 1
    },
    name: "Role"
  },
  {
    key: {
      "devices.id": 1
    },
    name: "Devices"
  },
  {
    key: {
      username: 1
    },
    name: "UserName",
    unique: true,
    background: true
  },
  {
    key: {
      companyID: 1
    },
    name: "CompanyID"
  },
  {
    key: {
      "emails.value": 1
    },
    name: "Email"
  },
  {
    key: {
      dateAdded: -1
    },
    name: "DateAddedToDB"
  }];