import { compare, GroupingReporter as reporter } from "dom-compare";
import * as test from "blue-tape"; 
import { DOMParser } from "xmldom";

/**
 * XML utility class for tests
 */
export default new class XML {

  /**
   * Subscribes MQTT topic
   * 
   * @param actual actual
   * @param expected: expected
   */

  /**
   * Asserts that XML strings are deeply equal 
   * 
   * @param t test
   * @param actual actual string 
   * @param expected expected string
   */
  public assertEquals(t: test.Test, actual: string, expected: string, message?: string) {
    const result = compare(this.parseXML(expected), this.parseXML(actual));
    if (!result.getResult()) {
      t.fail(JSON.stringify(reporter.getDifferences(result), null, 2));
    } else {
      t.pass(message || "XML strings are equal");
    }
  }

  /**
   * Parses XML string into DOM
   * 
   * @param string string
   * @return parsed DOM
   */
  private parseXML(string: string) {
    return new DOMParser().parseFromString(string, 'text/xml');
  }
  
}