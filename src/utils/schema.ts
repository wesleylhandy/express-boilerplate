import Joi from "@hapi/joi";

export const UserSchema = Joi.object<{
  username: string;
  password: string;
  repeat_password: string;
  access_token: string | number;
}>({
  username: Joi.string().email({ minDomainSegments: 2, tlds: { allow: true } }),

  password: Joi.string().pattern(
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-_]).{8,20}$/
  ),

  repeat_password: Joi.ref("password"),

  access_token: [Joi.string(), Joi.number()]
})
  .xor("password", "access_token")
  .with("repeat_password", "password");
