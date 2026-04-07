#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for MediLang Care
Tests all backend endpoints with realistic data
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any

# Test configuration
BASE_URL = "https://elderly-care-rx-2.preview.emergentagent.com/api"
TEST_USER_ID = "e2633b92-7f0e-4a74-8116-17244be774c6"
TODAY = datetime.now().strftime("%Y-%m-%d")

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        })
        
    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("Health Check", True, f"Status: {response.status_code}, Response: {data}")
                else:
                    self.log_result("Health Check", False, f"Invalid response format: {data}")
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            
    def test_create_test_user(self):
        """Create a test user for testing"""
        try:
            user_data = {
                "name": "Rajesh Kumar",
                "age": 72,
                "language": "en"
            }
            response = self.session.post(f"{self.base_url}/users", json=user_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    # Store the created user ID for cleanup
                    self.created_user_id = data["user"]["id"]
                    self.log_result("Create Test User", True, f"Created user with ID: {self.created_user_id}")
                    return data["user"]["id"]
                else:
                    self.log_result("Create Test User", False, f"Invalid response: {data}")
            else:
                self.log_result("Create Test User", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Test User", False, f"Exception: {str(e)}")
        return None
        
    def test_list_users(self):
        """Test GET /api/users"""
        try:
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code == 200:
                data = response.json()
                if "users" in data and isinstance(data["users"], list):
                    self.log_result("List Users", True, f"Found {len(data['users'])} users")
                else:
                    self.log_result("List Users", False, f"Invalid response format: {data}")
            else:
                self.log_result("List Users", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("List Users", False, f"Exception: {str(e)}")
            
    def test_get_user(self, user_id: str):
        """Test GET /api/users/{user_id}"""
        try:
            response = self.session.get(f"{self.base_url}/users/{user_id}")
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["id"] == user_id:
                    self.log_result("Get User", True, f"Retrieved user: {data.get('name', 'Unknown')}")
                    return data
                else:
                    self.log_result("Get User", False, f"User ID mismatch or invalid format: {data}")
            elif response.status_code == 404:
                self.log_result("Get User", False, f"User not found: {user_id}")
            else:
                self.log_result("Get User", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Get User", False, f"Exception: {str(e)}")
        return None
        
    def test_update_user(self, user_id: str):
        """Test PUT /api/users/{user_id}"""
        try:
            update_data = {
                "language": "hi"
            }
            response = self.session.put(f"{self.base_url}/users/{user_id}", json=update_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data:
                    updated_user = data["user"]
                    if updated_user.get("language") == "hi":
                        self.log_result("Update User", True, f"Successfully updated language to Hindi")
                    else:
                        self.log_result("Update User", False, f"Language not updated correctly: {updated_user}")
                else:
                    self.log_result("Update User", False, f"Invalid response: {data}")
            elif response.status_code == 404:
                self.log_result("Update User", False, f"User not found: {user_id}")
            else:
                self.log_result("Update User", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Update User", False, f"Exception: {str(e)}")
            
    def test_create_routine(self, user_id: str):
        """Test POST /api/routines"""
        try:
            routine_data = {
                "user_id": user_id,
                "medicine_name": "Metformin",
                "dosage": "500mg",
                "time_slot": "morning",
                "instructions": "Take with breakfast",
                "duration_days": 30
            }
            response = self.session.post(f"{self.base_url}/routines", json=routine_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "routine" in data:
                    routine = data["routine"]
                    self.created_routine_id = routine["id"]
                    self.log_result("Create Routine", True, f"Created routine for {routine['medicine_name']}")
                    return routine["id"]
                else:
                    self.log_result("Create Routine", False, f"Invalid response: {data}")
            else:
                self.log_result("Create Routine", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Routine", False, f"Exception: {str(e)}")
        return None
        
    def test_get_routines(self, user_id: str):
        """Test GET /api/routines/{user_id}"""
        try:
            response = self.session.get(f"{self.base_url}/routines/{user_id}")
            if response.status_code == 200:
                data = response.json()
                if "routines" in data and isinstance(data["routines"], dict):
                    routines = data["routines"]
                    total_routines = sum(len(routines.get(slot, [])) for slot in ["morning", "afternoon", "night"])
                    self.log_result("Get Routines", True, f"Found {total_routines} routines grouped by time slots")
                else:
                    self.log_result("Get Routines", False, f"Invalid response format: {data}")
            else:
                self.log_result("Get Routines", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Get Routines", False, f"Exception: {str(e)}")
            
    def test_log_dose(self, user_id: str, routine_id: str):
        """Test POST /api/dose-log"""
        try:
            dose_data = {
                "user_id": user_id,
                "routine_id": routine_id,
                "medicine_name": "Metformin",
                "time_slot": "morning",
                "scheduled_date": TODAY,
                "status": "taken",
                "notes": "Taken with breakfast as prescribed"
            }
            response = self.session.post(f"{self.base_url}/dose-log", json=dose_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "dose_log" in data:
                    dose_log = data["dose_log"]
                    self.log_result("Log Dose", True, f"Logged dose for {dose_log['medicine_name']} as {dose_log['status']}")
                else:
                    self.log_result("Log Dose", False, f"Invalid response: {data}")
            else:
                self.log_result("Log Dose", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Log Dose", False, f"Exception: {str(e)}")
            
    def test_get_dose_logs(self, user_id: str):
        """Test GET /api/dose-logs/{user_id}"""
        try:
            # Test without date filter
            response = self.session.get(f"{self.base_url}/dose-logs/{user_id}")
            if response.status_code == 200:
                data = response.json()
                if "dose_logs" in data and isinstance(data["dose_logs"], list):
                    self.log_result("Get Dose Logs (All)", True, f"Found {len(data['dose_logs'])} dose logs")
                else:
                    self.log_result("Get Dose Logs (All)", False, f"Invalid response format: {data}")
            else:
                self.log_result("Get Dose Logs (All)", False, f"Status: {response.status_code}, Response: {response.text}")
                
            # Test with date filter
            response = self.session.get(f"{self.base_url}/dose-logs/{user_id}?date={TODAY}")
            if response.status_code == 200:
                data = response.json()
                if "dose_logs" in data and isinstance(data["dose_logs"], list):
                    self.log_result("Get Dose Logs (Today)", True, f"Found {len(data['dose_logs'])} dose logs for today")
                else:
                    self.log_result("Get Dose Logs (Today)", False, f"Invalid response format: {data}")
            else:
                self.log_result("Get Dose Logs (Today)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Get Dose Logs", False, f"Exception: {str(e)}")
            
    def test_get_dose_stats(self, user_id: str):
        """Test GET /api/dose-logs/{user_id}/stats"""
        try:
            response = self.session.get(f"{self.base_url}/dose-logs/{user_id}/stats?days=7")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_doses", "taken", "missed", "pending", "compliance_rate", "days"]
                if all(field in data for field in required_fields):
                    self.log_result("Get Dose Stats", True, f"Compliance rate: {data['compliance_rate']}% over {data['days']} days")
                else:
                    self.log_result("Get Dose Stats", False, f"Missing required fields in response: {data}")
            else:
                self.log_result("Get Dose Stats", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Get Dose Stats", False, f"Exception: {str(e)}")
            
    def test_weekly_report(self, user_id: str):
        """Test GET /api/weekly-report/{user_id}"""
        try:
            response = self.session.get(f"{self.base_url}/weekly-report/{user_id}")
            if response.status_code == 200:
                data = response.json()
                if "report" in data:
                    report = data["report"]
                    required_fields = ["user_name", "start_date", "end_date", "total_doses", "doses_taken", "compliance_rate", "details"]
                    if all(field in report for field in required_fields):
                        self.log_result("Weekly Report", True, f"Generated report for {report['user_name']} with {report['compliance_rate']}% compliance")
                    else:
                        self.log_result("Weekly Report", False, f"Missing required fields in report: {report}")
                else:
                    self.log_result("Weekly Report", False, f"Invalid response format: {data}")
            elif response.status_code == 404:
                self.log_result("Weekly Report", False, f"User not found: {user_id}")
            else:
                self.log_result("Weekly Report", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Weekly Report", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🧪 Starting MediLang Care Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Test User ID: {TEST_USER_ID}")
        print(f"📅 Test Date: {TODAY}")
        print("=" * 60)
        
        # Initialize variables
        self.created_user_id = None
        self.created_routine_id = None
        
        # 1. Health Check
        self.test_health_check()
        
        # 2. Create a test user for comprehensive testing
        created_user_id = self.test_create_test_user()
        test_user_id = created_user_id if created_user_id else TEST_USER_ID
        
        # 3. User Management Tests
        self.test_list_users()
        user_data = self.test_get_user(test_user_id)
        self.test_update_user(test_user_id)
        
        # 4. Routine Management Tests
        routine_id = self.test_create_routine(test_user_id)
        self.test_get_routines(test_user_id)
        
        # 5. Dose Logging Tests (only if we have a routine)
        if routine_id:
            self.test_log_dose(test_user_id, routine_id)
        else:
            # Try with a dummy routine ID if creation failed
            self.test_log_dose(test_user_id, "dummy-routine-id")
            
        self.test_get_dose_logs(test_user_id)
        self.test_get_dose_stats(test_user_id)
        
        # 6. Weekly Report Test
        self.test_weekly_report(test_user_id)
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = APITester(BASE_URL)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()