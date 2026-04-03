import requests
import sys
import json
from datetime import datetime

class SolarPumpInventoryTester:
    def __init__(self, base_url="https://solar-pump-inventory.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.component_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: {len(response_data)} items returned")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.status_code < 400 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_get_components(self):
        """Test getting all components"""
        success, response = self.run_test("Get Components", "GET", "components", 200)
        if success and response:
            print(f"   Found {len(response)} components")
            if len(response) > 0:
                self.component_id = response[0]['id']  # Store for later tests
                print(f"   Sample component: {response[0]['name']} - Qty: {response[0]['quantity']}")
        return success, response

    def test_get_motor_requirements(self):
        """Test getting motor requirements"""
        success, response = self.run_test("Get Motor Requirements", "GET", "motor-requirements", 200)
        if success and response:
            print(f"   Found {len(response)} motor requirements")
            motor_types = set(req['motor_type'] for req in response)
            print(f"   Motor types: {list(motor_types)}")
        return success, response

    def test_calculate_max_production(self):
        """Test calculating max production"""
        success, response = self.run_test("Calculate Max Production", "GET", "calculate-max-production", 200)
        if success and response:
            print(f"   Max production: {response}")
        return success, response

    def test_update_component(self):
        """Test updating component quantity"""
        if not self.component_id:
            print("❌ Skipping component update - no component ID available")
            return False, {}
        
        success, response = self.run_test(
            "Update Component", 
            "PUT", 
            f"components/{self.component_id}", 
            200,
            data={"quantity": 150}
        )
        if success and response:
            print(f"   Updated quantity to: {response.get('quantity', 'N/A')}")
        return success, response

    def test_withdraw_components(self):
        """Test withdrawing components for motor production"""
        success, response = self.run_test(
            "Withdraw Components (3HP)", 
            "POST", 
            "withdraw", 
            200,
            data={"motor_type": "3HP", "quantity": 1}
        )
        if success and response:
            print(f"   Withdrawal result: {response.get('success', False)}")
            print(f"   Message: {response.get('message', 'N/A')}")
        return success, response

    def test_check_feasibility(self):
        """Test checking production feasibility"""
        success, response = self.run_test(
            "Check Feasibility", 
            "POST", 
            "check-feasibility", 
            200,
            data={"hp_3": 2, "hp_5": 1, "hp_7_5": 1}
        )
        if success and response:
            print(f"   Feasible: {response.get('possible', False)}")
            print(f"   Message: {response.get('message', 'N/A')}")
            if response.get('missing_components'):
                print(f"   Missing components: {len(response['missing_components'])}")
        return success, response

    def test_invalid_motor_type_withdraw(self):
        """Test withdrawing with invalid motor type"""
        success, response = self.run_test(
            "Invalid Motor Type Withdraw", 
            "POST", 
            "withdraw", 
            404,
            data={"motor_type": "10HP", "quantity": 1}
        )
        return success, response

    def test_negative_quantity_feasibility(self):
        """Test feasibility check with negative quantities"""
        success, response = self.run_test(
            "Negative Quantity Feasibility", 
            "POST", 
            "check-feasibility", 
            400,
            data={"hp_3": -1, "hp_5": 1, "hp_7_5": 1}
        )
        return success, response

def main():
    print("🚀 Starting Solar Pump Inventory Management System API Tests")
    print("=" * 60)
    
    tester = SolarPumpInventoryTester()
    
    # Test sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_root_endpoint())
    test_results.append(tester.test_get_components())
    test_results.append(tester.test_get_motor_requirements())
    test_results.append(tester.test_calculate_max_production())
    
    # Component management tests
    test_results.append(tester.test_update_component())
    
    # Production workflow tests
    test_results.append(tester.test_withdraw_components())
    test_results.append(tester.test_check_feasibility())
    
    # Error handling tests
    test_results.append(tester.test_invalid_motor_type_withdraw())
    test_results.append(tester.test_negative_quantity_feasibility())
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())