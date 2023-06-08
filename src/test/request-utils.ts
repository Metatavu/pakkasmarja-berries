/**
 * Utility class for test requests
 */
export default new class RequestUtils {

  /**
   * Creates binary parser for supertest
  */
  createBinaryParser() {
    return (res: any, callback: any) => {
      res.setEncoding("binary");
      res.data = "";
      res.on("data", (chunk: any) => {
        res.data += chunk;
      });

      res.on("end", () => {
        callback(null, Buffer.from(res.data, "binary"));
      });
    };
  }

}