declare module "keycloak-admin-client" {
  
  interface Settings {
    realm: string,
    baseUrl: string,
    username: string,
    password: string,
    grant_type: string,
    client_id: string
  }

  function keycloak_admin_client(settings: Settings): any;
  namespace keycloak_admin_client { }
  export = keycloak_admin_client;
}